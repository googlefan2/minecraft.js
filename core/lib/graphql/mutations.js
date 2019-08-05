import gql from 'graphql-tag'

export const UPDATE_PLAYER_MUTATION = gql`
  mutation UpdatePlayer(
    $id: ID!
    $x: Float
    $y: Float
    $z: Float
    $dirx: Float
    $diry: Float
    $cursor: Int
    $data: String
  ) {
    updatePlayer(
      data: {
        id: $id
        x: $x
        y: $y
        z: $z
        dirx: $dirx
        diry: $diry
        cursor: $cursor
        data: $data
      }
    ) {
      x
      y
      z
    }
  }
`

export const UPDATE_WORLD_MUTATION = gql`
  mutation UpdateWorld($id: ID!, $name: String, $time: Float, $days: Int) {
    updateWorld(data: { id: $id, name: $name, time: $time, days: $days }) {
      name
      time
      days
    }
  }
`

export const RUN_COMMAND_MUTATION = gql`
  mutation RunCommand($playerId: ID!, $worldId: ID!, $command: String!) {
    runCommand(
      data: { playerId: $playerId, worldId: $worldId, command: $command }
    )
  }
`

export const REQUEST_CHUNKS_MUTATION = gql`
  mutation RequestChunks(
    $worldId: ID!
    $username: String!
    $chunks: [String!]!
    $seed: String!
  ) {
    requestChunks(
      data: {
        worldId: $worldId
        username: $username
        chunks: $chunks
        seed: $seed
      }
    )
  }
`
