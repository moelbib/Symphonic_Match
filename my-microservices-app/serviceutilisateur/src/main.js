const { Kafka } = require('kafkajs');
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

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'service-utilisateur-group' });


async function startKafka() {
  let connected = false;
  while (!connected) {
    try {
      await producer.connect();
      console.log('Kafka producer connected');
      isProducerConnected = true;
      await consumer.connect();
      console.log('Kafka consumer connected');
      connected = true;
    } catch (error) {
      console.error('Error connecting Kafka, retrying in 5 seconds:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  try {
    await consumer.subscribe({ topic: 'profil-musical-topic', fromBeginning: true });
    console.log('Subscribed to topic: profil-musical-topic');
  } catch (error) {
    console.error('Error subscribing to topic:', error);
  }

  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log({
          partition,
          offset: message.offset,
          value: message.value.toString(),
        });
      },
    });
    console.log('Consumer running');
  } catch (error) {
    console.error('Error running consumer:', error);
  }

}

module.exports = { startKafka };

async function startServer() {
  const app = express();
  app.use(express.json());


  // Database connection
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'utilisateur-db',
      port: 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'admin',
      database: 'utilisateur',
    });
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }

  // Endpoint de test pour vérifier que le serveur fonctionne
  app.get('/test', (req, res) => {
    res.send('Server is running');
  });


  app.get('/users', async (req, res) => {
    try {
      const [rows] = await db.execute('SELECT * FROM utilisateur');
      res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });


  // Endpoint to retrieve a specific user by ID from the database
  app.get('/user/:id', async (req, res) => {
    const userId = req.params.id;
    try {
      const [rows] = await db.execute('SELECT * FROM utilisateur WHERE id = ?', [userId]);
      if (rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
      } else {
        res.status(200).json(rows[0]);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });




  app.post('/insert', async (req, res) => {
    const { genre, nom, prenom, email, bio, date_inscription, localisation } = req.body;
    try {
      const [result] = await db.execute(
          'INSERT INTO utilisateur (genre, nom, prenom, email, bio, date_inscription, Localisation) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [genre, nom, prenom, email, bio, date_inscription, localisation]
      );
      res.status(201).json({ id: result.insertId });
    } catch (error) {
      console.error('Error inserting user:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });


  const server = new ApolloServer({ typeDefs, resolvers });

  try {
    await server.start();
    console.log('Apollo Server started');
  } catch (error) {
    console.error('Error starting Apollo Server:', error);
  }

  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 32007;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });

  await startKafka();
}

startServer().catch(error => console.error('Error starting server:', error));
