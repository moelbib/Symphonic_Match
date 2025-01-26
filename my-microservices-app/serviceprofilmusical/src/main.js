const { Kafka, Partitioners } = require('kafkajs');
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const mysql = require('mysql2/promise');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  requestTimeout: 60000,
  enforceRequestTimeout: false,
  maxInFlightRequests: 1,
  retry: {
    retries: 10,
    initialRetryTime: 300,
    factor: 0.2,
  }
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

const consumer = kafka.consumer({ groupId: 'service-profil-musical-group' });

const dbConfig = {
  host: process.env.DB_HOST || 'profilmusical-db',
  port: 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'musicaux'
};

const MAX_MESSAGE_SIZE = parseInt(process.env.KAFKA_MESSAGE_MAX_BYTES, 10) || 200000000; // 200 MB

async function startKafka(){
  try {
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

    await consumer.subscribe({ topic: 'utilisateur-topic', fromBeginning: true });
    console.log('Subscribed to topic: utilisateur-topic');

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
            const [result] = await connection.execute('DELETE FROM musicaux WHERE id_utilisateur = ?', [data.id]);
            await connection.end();
            console.log(`Profil musical supprimé pour l'utilisateur ${data.id}`);
          } catch (error) {
            console.error(`Error deleting profil musical for user ${data.id}:`, error);
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
  } catch (error) {
    console.error('Failed to start Kafka:', error);
    process.exit(1);
  }
}

async function startServer() {
  const app = express();

  const server = new ApolloServer({ typeDefs, resolvers });

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

    const PORT = process.env.PORT || 32008;

    const httpServer = await app.listen(PORT, '0.0.0.0', () => {
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

  // Connexion à la base de données
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'profilmusical-db',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'admin',
      database: process.env.DB_NAME || 'musicaux'
    });

    await startKafka(db);
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  }
}


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

startServer();
