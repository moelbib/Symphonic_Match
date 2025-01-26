const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Evenement {
    id_evenement: ID!
    nom: String!
    date: String!
    localisation: String!
    description: String
  }

  type Participation_Evenement {
    id_participation: ID!
    id_utilisateur: ID!
    id_evenement: ID!
  }

  type Query {
    evenements: [Evenement]
    evenement(id_evenement: ID!): Evenement
    participations: [Participation_Evenement]
    participation(id_participation: ID!): Participation_Evenement
  }

  type Mutation {
    creerEvenement(nom: String!, date: String!, localisation: String!, description: String): Evenement
    inscrireEvenement(id_utilisateur: ID!, id_evenement: ID!): Participation_Evenement
    supprimerEvenement(id_evenement: ID!): Boolean
    desinscrireEvenement(id_participation: ID!): Boolean
  }
`;

module.exports = typeDefs;
