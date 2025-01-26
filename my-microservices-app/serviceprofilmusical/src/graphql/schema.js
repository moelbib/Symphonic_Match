const { gql } = require('apollo-server-express');

const typeDefs = gql`
type ProfilMusical {
  id: ID!
  id_utilisateur: ID!
  genre_favoris: String
  artistes_favoris: String
  chansons_favoris: String
  id_commentaire: Int
}

type Playlist {
    id: ID!
    name: String!
    tracks: [Track!]
  }

  type Track {
    id: ID!
    name: String!
    artists: [Artist!]
    album: String
  }

  type Artist {
    id: ID!
    name: String!
  }

type Query {
  profilMusical(id_utilisateur: ID!): ProfilMusical
  spotifyPlaylists(access_token: String!): [Playlist!]
  spotifyFavoriteTracks(access_token: String!): [Track!]
}

type Mutation {
  createProfilMusical(id_utilisateur: ID!, genre_favoris: String, artistes_favoris: String, chansons_favoris: String): ProfilMusical
  updateProfilMusical(id_utilisateur: ID!, genre_favoris: String, artistes_favoris: String, chansons_favoris: String): ProfilMusical
  deleteProfilMusical(id_utilisateur: ID!): String
}
`;

module.exports = typeDefs;
