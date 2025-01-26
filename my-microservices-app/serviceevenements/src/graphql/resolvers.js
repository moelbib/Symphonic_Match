const mysql = require('mysql2/promise');
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const producer = kafka.producer();
let isProducerConnected = false;

const connectProducer = async () => {
  if (!isProducerConnected) {
    try {
      await producer.connect();
      console.log('Kafka producer connected');
      isProducerConnected = true;
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
    }
  }
};

const dbConfig = {
  host: process.env.DB_HOST || 'evenement-db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'evenement'
};

const resolvers = {
  Query: {
    evenements: async () => {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT * FROM Evenement');
      await connection.end();
      return rows;
    },
    evenement: async (_, { id_evenement }) => {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT * FROM Evenement WHERE id_evenement = ?', [id_evenement]);
      await connection.end();
      return rows[0];
    },
    participations: async () => {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT * FROM Participation_Evenement');
      await connection.end();
      return rows;
    },
    participation: async (_, { id_participation }) => {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT * FROM Participation_Evenement WHERE id_participation = ?', [id_participation]);
      await connection.end();
      return rows[0];
    },
  },
  Mutation: {
    creerEvenement: async (_, { nom, date, localisation, description }) => {
      const connection = await mysql.createConnection(dbConfig);
      const [result] = await connection.execute(
          'INSERT INTO Evenement (nom, date, localisation, description) VALUES (?, ?, ?, ?)',
          [nom, date, localisation, description]
      );
      const [rows] = await connection.execute('SELECT * FROM Evenement WHERE id_evenement = ?', [result.insertId]);
      await connection.end();

      const newEvenement = rows[0];
      await connectProducer();

      try {
        await producer.send({
          topic: 'evenements-topic',
          messages: [{ value: JSON.stringify(newEvenement) }],
        });
        console.log('Message sent to Kafka');
      } catch (error) {
        console.error('Failed to send message to Kafka:', error);
      }

      return newEvenement;
    },
    inscrireEvenement: async (_, { id_utilisateur, id_evenement }) => {
      const connection = await mysql.createConnection(dbConfig);
      const [result] = await connection.execute(
          'INSERT INTO Participation_Evenement (id_utilisateur, id_evenement) VALUES (?, ?)',
          [id_utilisateur, id_evenement]
      );
      const [rows] = await connection.execute('SELECT * FROM Participation_Evenement WHERE id_participation = ?', [result.insertId]);
      await connection.end();

      const newParticipation = rows[0];
      await connectProducer();

      try {
        await producer.send({
          topic: 'evenements-topic',
          messages: [{ value: JSON.stringify(newParticipation) }],
        });
        console.log('Message sent to Kafka');
      } catch (error) {
        console.error('Failed to send message to Kafka:', error);
      }

      return newParticipation;
    },
    supprimerEvenement: async (_, { id_evenement }) => {
      const connection = await mysql.createConnection(dbConfig);
      const [result] = await connection.execute('DELETE FROM Evenement WHERE id_evenement = ?', [id_evenement]);
      await connection.end();

      const success = result.affectedRows > 0;
      if (success) {
        await connectProducer();

        try {
          await producer.send({
            topic: 'evenements-topic',
            messages: [{ value: JSON.stringify({ action: 'delete', id_evenement }) }],
          });
          console.log('Message sent to Kafka');
        } catch (error) {
          console.error('Failed to send message to Kafka:', error);
        }
      }

      return success;
    },
    desinscrireEvenement: async (_, { id_participation }) => {
      const connection = await mysql.createConnection(dbConfig);
      const [result] = await connection.execute('DELETE FROM Participation_Evenement WHERE id_participation = ?', [id_participation]);
      await connection.end();

      const success = result.affectedRows > 0;
      if (success) {
        await connectProducer();

        try {
          await producer.send({
            topic: 'evenements-topic',
            messages: [{ value: JSON.stringify({ action: 'delete', id_participation }) }],
          });
          console.log('Message sent to Kafka');
        } catch (error) {
          console.error('Failed to send message to Kafka:', error);
        }
      }

      return success;
    }
  }
};

module.exports = resolvers;
