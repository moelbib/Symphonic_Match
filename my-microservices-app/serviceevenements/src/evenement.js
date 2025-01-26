const { Kafka, Partitioners } = require('kafkajs');
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const mysql = require('mysql2/promise');

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'my-app',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  requestTimeout: 60000,
  enforceRequestTimeout: false,
  maxInFlightRequests: 1,
  retry: {
    retries: 20, // Augmenter le nombre de réessais
    initialRetryTime: 300,
    factor: 0.2,
  }
});


const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

const consumer = kafka.consumer({ groupId: 'service-evenements-group' });


const dbConfig = {
  host: process.env.DB_HOST || 'evenement-db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'evenement'
};

const MAX_MESSAGE_SIZE = parseInt(process.env.KAFKA_MESSAGE_MAX_BYTES, 10) || 200000000; // 200 MB

async function startKafka() {
  let connected = false;
  while (!connected) {
    try {
      await producer.connect();
      console.log('Kafka producer connected');
      await consumer.connect();
      console.log('Kafka consumer connected');
      connected = true;
    } catch (error) {
      console.error('Error connecting Kafka, retrying in 5 seconds:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  try {
    await consumer.subscribe({ topic: 'utilisateur-topic', fromBeginning: true });
    console.log('Subscribed to topic: utilisateur-topic');
  } catch (error) {
    console.error('Error subscribing to topic:', error);
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`Received message: ${message.value.toString()}`);
      const messageSize = Buffer.byteLength(message.value);

      if (messageSize > MAX_MESSAGE_SIZE) {
        console.error(`Received message of size ${messageSize} bytes exceeds limit of ${MAX_MESSAGE_SIZE} bytes`);
        return;
      }

      const data = JSON.parse(message.value.toString());
      console.log(`Parsed message data: ${JSON.stringify(data)}`);
      if (data.action === 'delete' && data.id) {
        console.log(`Processing delete action for user: ${data.id}`);
        try {
          const connection = await mysql.createConnection(dbConfig);
          const [result] = await connection.execute('DELETE FROM Participation_Evenement WHERE id_utilisateur = ?', [data.id]);
          await connection.end();
          console.log(`Participation à l'événement supprimée pour l'utilisateur ${data.id}`);
        } catch (error) {
          console.error(`Error deleting participation for user ${data.id}:`, error);
        }
      }
      console.log({
        partition,
        offset: message.offset,
        value: message.value.toString(),
      });
    },
  });

  console.log('Kafka producer and consumer started successfully');
}

async function startServer() {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({ producer }) // Pass producer to resolvers via context
  });

  try {
    await server.start();
    server.applyMiddleware({ app });

    app.use((error, req, res, next) => {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    });

    app.use((req, res, next) => {
      console.log('Request URL:', req.originalUrl);
      next();
    });

    const PORT = process.env.PORT || 32006;
    const httpServer = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    });

    process.on('SIGINT', async () => {
      console.log('Server shutting down...');
      await server.stop();
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }

  try {
    const db = await mysql.createConnection(dbConfig);
    await startKafka();
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  }
}

startServer().catch(error => console.error('Error starting server:', error));


async function sendMessage(topic, value) {
  const messageSize = Buffer.byteLength(value);

  if (messageSize > MAX_MESSAGE_SIZE) {
    console.error(`Message size ${messageSize} bytes exceeds limit of ${MAX_MESSAGE_SIZE} bytes`);
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [{ value }],
    });
    console.log(`Message sent successfully to topic ${topic}`);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}
