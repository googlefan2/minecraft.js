import gql from 'graphql-tag'

export const GET_CHUNK_QUERY = gql`
  query GetChunk($worldId: ID!, $x: Int!, $z: Int!) {
    getChunk(data: { worldId: $worldId, x: $x, z: $z })
  }
`
