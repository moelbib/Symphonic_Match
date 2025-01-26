// src/apolloClient.js
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'http://localhost:8001/graphql', // URL of your GraphQL service
  }),
  cache: new InMemoryCache()
});

export default client;
