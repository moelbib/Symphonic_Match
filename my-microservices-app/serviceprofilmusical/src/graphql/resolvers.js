const mysql = require('mysql2/promise');

const { Kafka } = require('kafkajs');
const { getPlaylists, getFavoriteTracks } = require('../../Spotify/spotifyService');

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
  host: process.env.DB_HOST || 'profilmusical-db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'musicaux'
};

const resolvers = {
  Query: {
    profilMusical: async (_, { id_utilisateur }) => {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT * FROM musicaux WHERE id_utilisateur = ?', [id_utilisateur]);
      await connection.end();
      return rows[0];
    },
    spotifyPlaylists: async (_, { access_token }) => {
      return await getPlaylists(access_token);
    },
    spotifyFavoriteTracks: async (_, { access_token }) => {
      return await getFavoriteTracks(access_token);
    },
  },
  Mutation: {
    createProfilMusical: async (_, { id_utilisateur, genre_favoris = null, artistes_favoris = null, chansons_favoris = null }) => {
      const connection = await mysql.createConnection(dbConfig);

      const values = [
        id_utilisateur || null,
        genre_favoris || null,
        artistes_favoris || null,
        chansons_favoris || null
      ];

      const [result] = await connection.execute(
          'INSERT INTO musicaux (id_utilisateur, genre_favoris, artistes_favoris, chansons_favoris) VALUES (?, ?, ?, ?)',
          values
      );

      const [rows] = await connection.execute('SELECT * FROM musicaux WHERE id = ?', [result.insertId]);
      await connection.end();

      await connectProducer();

      try {
        const newProfilMusical = rows[0];
        await producer.send({
          topic: 'profil-musical-topic',
          messages: [
            { value: JSON.stringify(newProfilMusical) },
          ],
        });
        console.log('Message sent to Kafka');
      } catch (error) {
        console.error('Failed to send message to Kafka:', error);
      }

      return rows[0];
    },
    updateProfilMusical: async (_, { id_utilisateur, genre_favoris= null, artistes_favoris= null, chansons_favoris= null}) => {
      const connection = await mysql.createConnection(dbConfig);
      await connection.execute(
          'UPDATE musicaux SET genre_favoris = ?, artistes_favoris = ?, chansons_favoris = ? WHERE id_utilisateur = ?',
          [genre_favoris, artistes_favoris, chansons_favoris, id_utilisateur]
      );
      const [rows] = await connection.execute('SELECT * FROM musicaux WHERE id_utilisateur = ?', [id_utilisateur]);
      await connection.end();
      return rows[0];
    },
    deleteProfilMusical: async (_, { id_utilisateur }) => {
      const connection = await mysql.createConnection(dbConfig);
      await connection.execute('DELETE FROM musicaux WHERE id_utilisateur = ?', [id_utilisateur]);
      await connection.end();
      return `Profil musical pour l'utilisateur ${id_utilisateur} supprimé avec succès`;
    }
  },
};

module.exports = resolvers;
