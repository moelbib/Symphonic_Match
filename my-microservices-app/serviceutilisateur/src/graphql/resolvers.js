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
  host: process.env.DB_HOST || 'utilisateur-db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'utilisateur'
};

const resolvers = {
  Query: {
    utilisateur: async (_, { id }) => {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT * FROM utilisateur WHERE id = ?', [id]);
      await connection.end();
      if (rows.length > 0) {
        const user = rows[0];
        user.date_inscription = new Date(user.date_inscription).toISOString().split('T')[0]; // Convertir la date au format YYYY-MM-DD
        return user;
      }
      return null;
    },
    utilisateurs: async () => {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT * FROM utilisateur');
      await connection.end();
      return rows.map(row => {
        row.date_inscription = new Date(row.date_inscription).toISOString().split('T')[0];
        return row;
      });
    },
  },
  Mutation: {
    createUtilisateur: async (parent, { genre, nom, prenom, email, bio, localisation }) => {
      if (!genre || !nom || !prenom || !email || !bio || !localisation) {
        throw new Error('Tous les champs sont requis.');
      }

      console.log('Received values:', { genre, nom, prenom, email, bio, localisation });

      const connection = await mysql.createConnection(dbConfig);
      const date_inscription = new Date().toISOString().split('T')[0];

      console.log('Inserting values:', [genre, nom, prenom, email, bio, date_inscription, localisation]);

      const [result] = await connection.execute(
          'INSERT INTO utilisateur (genre, nom, prenom, email, bio, date_inscription, localisation) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [genre, nom, prenom, email, bio, date_inscription, localisation]
      );

      console.log('Insert result:', result);

      const [rows] = await connection.execute('SELECT * FROM utilisateur WHERE id = ?', [result.insertId]);
      await connection.end();

      if (!rows[0]) {
        throw new Error('Erreur lors de la récupération de l\'utilisateur inséré.');
      }

      console.log('Inserted user:', rows[0]);

      const newUtilisateur = rows[0];

      await connectProducer();
      try {
        await producer.send({
          topic: 'utilisateur-topic',
          messages: [
            { value: JSON.stringify(newUtilisateur) },
          ],
        });
        console.log('Message sent to Kafka');
      } catch (error) {
        console.error('Failed to send message to Kafka:', error);
      }

      return newUtilisateur;
    },updateUtilisateur: async (parent, { id, genre, nom, prenom, email, bio, localisation }) => {
      const connection = await mysql.createConnection(dbConfig);

      // Récupérer l'utilisateur actuel
      const [rows] = await connection.execute('SELECT * FROM utilisateur WHERE id = ?', [id]);
      if (rows.length === 0) {
        throw new Error('User not found');
      }

      const currentUser = rows[0];

      // Mettre à jour les champs fournis
      const updatedUser = {
        ...currentUser,
        genre: genre || currentUser.genre,
        nom: nom || currentUser.nom,
        prenom: prenom || currentUser.prenom,
        email: email || currentUser.email,
        bio: bio || currentUser.bio,
        localisation: localisation || currentUser.localisation,
      };

      console.log('Updating values:', updatedUser);

      await connection.execute(
          'UPDATE utilisateur SET genre = ?, nom = ?, prenom = ?, email = ?, bio = ?, localisation = ? WHERE id = ?',
          [updatedUser.genre, updatedUser.nom, updatedUser.prenom, updatedUser.email, updatedUser.bio, updatedUser.localisation, id]
      );

      await connection.end();

      await connectProducer();
      try {
        await producer.send({
          topic: 'utilisateur-topic',
          messages: [
            { value: JSON.stringify({ action: 'update', ...updatedUser }) },
          ],
        });
        console.log('Update message sent to Kafka');
      } catch (error) {
        console.error('Failed to send update message to Kafka:', error);
      }

      return updatedUser;
    },
    deleteUtilisateur: async (parent, { id }) => {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT * FROM utilisateur WHERE id = ?', [id]);
      if (rows.length === 0) {
        throw new Error('User not found');
      }
      const deletedUser = rows[0];
      await connection.execute('DELETE FROM utilisateur WHERE id = ?', [id]);
      await connection.end();

      await connectProducer();
      try {
        await producer.send({
          topic: 'utilisateur-topic',
          messages: [
            { value: JSON.stringify({ action: 'delete', id }) },
          ],
        });
        console.log('Delete message sent to Kafka');
      } catch (error) {
        console.error('Failed to send delete message to Kafka:', error);
      }

      return deletedUser;
    },
  },
};

module.exports = resolvers;