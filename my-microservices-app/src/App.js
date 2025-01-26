// src/App.js
import React from 'react';
import { useQuery, gql } from '@apollo/client';

const GET_DATA = gql`
  query {
    getData {
      id
      value
    }
  }
`;

function App() {
  const { loading, error, data } = useQuery(GET_DATA);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;
  if (!data || !data.getData) return <p>No data found</p>;

  return (
    
    <div>
      bonjour
      {data.getData.map(({ id, value }) => (
        <p key={id}>{value}</p>
      ))}
    </div>
  );
}

export default App;
