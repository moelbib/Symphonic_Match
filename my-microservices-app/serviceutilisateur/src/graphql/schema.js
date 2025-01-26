const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Utilisateur {
    id: ID!
    genre: String
    nom: String
    prenom: String
    email: String
    bio: String
    date_inscription: String
    localisation: String
  }

  type Query {
    utilisateur(id: ID!): Utilisateur
    utilisateurs: [Utilisateur]
  }

  type Mutation {
    createUtilisateur(genre: String, nom: String, prenom: String, email: String, bio: String, localisation: String): Utilisateur
    updateUtilisateur(id: ID!, genre: String, nom: String, prenom: String, email: String, bio: String, localisation: String): Utilisateur
    deleteUtilisateur(id: ID!): Utilisateur
  }
`;

module.exports = typeDefs;
