import { createYoga } from "graphql-yoga";
import {
  handleSubscriptions,
  createWsConnectionPoolClass,
  subscribe,
  DefaultPublishableContext,
  createDefaultPublishableContext,
} from "../../dist";
import { schema } from "./schema";

export interface ENV {
  WS_CONNECTION_POOL: DurableObjectNamespace;
  SUBSCRIPTIONS: D1Database;
}

// export const schemaX = makeExecutableSchema<DefaultPublishableContext<ENV>>({
//   typeDefs: /* GraphQL */ `
//     type Greeting {
//       greeting: String
//     }
//     type Query {
//       ping: String
//     }
//     type Subscription {
//       greetings(greeting: String): Greeting
//     }
//     type Mutation {
//       greet(greeting: String): String
//     }
//   `,
//   resolvers: {
//     Query: {
//       ping: () => "pong",
//     },
//     Mutation: {
//       greet: async (root, args, context) => {
//         context.publish("GREETINGS", {
//           greetings: { greeting: args.greeting },
//         });
//         return "ok";
//       },
//     },
//     Subscription: {
//       greetings: {
//         subscribe: subscribe("GREETINGS", {
//           filter: (root, args) => {
//             return args.greeting
//               ? { greetings: { greeting: args.greeting } }
//               : {};
//           },
//         }),
        
//       },
//     },
//   },
// });

const settings = {
  schema,
  wsConnectionPool: (env: ENV) => env.WS_CONNECTION_POOL,
  subscriptionsDb: (env: ENV) => env.SUBSCRIPTIONS,
};

const yoga = createYoga<DefaultPublishableContext<ENV>>({
  schema,
  graphiql: {
    // Use WebSockets in GraphiQL
    subscriptionsProtocol: "WS",
    defaultQuery: /* GraphQL */ `
      query Ping {
        ping
      }

      mutation Say {
        greet(greeting: "hi!")
      }

      subscription Listen {
        greetings {
          greeting
        }
      }

      subscription ListenToHi {
        greetings(greeting: "hi!") {
          greeting
        }
      }
    `,
  },
});

const baseFetch: ExportedHandlerFetchHandler<ENV> = (
  request,
  env,
  executionCtx
) =>
  yoga.handleRequest(
    request,
    createDefaultPublishableContext({
      env,
      executionCtx,
      ...settings,
    })
  );

const fetch = handleSubscriptions({
  fetch: baseFetch,
  ...settings,
});

export default { fetch };

export const WsConnectionPool = createWsConnectionPoolClass(settings);