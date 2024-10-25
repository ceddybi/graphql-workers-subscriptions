import { createYoga } from "graphql-yoga";
import {
  handleSubscriptions,
  createWsConnectionPoolClass,
  subscribe,
  DefaultPublishableContext,
  createDefaultPublishableContext,
} from "../../src";
import { typeDefsAndResolvers } from "./schema";
import { makeExecutableSchema } from "@graphql-tools/schema";
import debug from "debug";
process.env.DEBUG = "app*";
// fake app

const log = debug('app');

log("Hello World");

// if (typeof process !== 'undefined' && process.versions && process.versions.node) {
//   console.log('This is running in a Node.js environment');
// } else {
//   console.log('This is running in a browser environment');
// }


function detectEnvironment(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') {
    return 'Next.js Edge Runtime';
  } else if (typeof self !== 'undefined' && self.constructor.name === 'ServiceWorkerGlobalScope') {
    return 'Cloudflare Worker or Service Worker';
  } else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 'Node.js';
  } else if (typeof window !== 'undefined') {
    return 'Browser';
    // @ts-ignore
  } else if (typeof Deno !== 'undefined') {
    return 'Deno';
    // @ts-ignore
  } else if (typeof Bun !== 'undefined') {
    return 'Bun';
  } else {
    return 'Unknown environment';
  }
}

console.log(detectEnvironment());
// import { builder } from "./schema.pothos";
export interface ENV {
  WS_CONNECTION_POOL: DurableObjectNamespace;
  SUBSCRIPTIONS: D1Database;
}
// console.log("process", JSON.stringify(process, null, 2));
// const schema = builder.toSchema();
const { Subscription, ...otherResolvers } = typeDefsAndResolvers.resolvers;
export const schema = makeExecutableSchema<DefaultPublishableContext<ENV>>({
  typeDefs: typeDefsAndResolvers.typeDefs,
  resolvers: {
    ...otherResolvers,
    Subscription: {
      greetings: {
        subscribe: subscribe("GREETINGS", {
          filter: (root, args) => {
            return args.greeting
              ? { greetings: { greeting: args.greeting } }
              : {};
          },
        }),

      },
    },
  },
});

export const schemaX = makeExecutableSchema<DefaultPublishableContext<ENV>>({
  typeDefs: /* GraphQL */ `
    type Greeting {
      greeting: String
    }
    type Query {
      ping: String
    }
    type Subscription {
      greetings(greeting: String): Greeting
    }
    type Mutation {
      greet(greeting: String): String
    }
  `,
  resolvers: {
    Query: {
      ping: () => "pong",
    },
    Mutation: {
      greet: async (root, args, context) => {
        context.publish("GREETINGS", {
          greetings: { greeting: args.greeting },
        });
        return "ok";
      },
    },
    Subscription: {
      greetings: {
        subscribe: subscribe("GREETINGS", {
          filter: (root, args) => {
            return args.greeting
              ? { greetings: { greeting: args.greeting } }
              : {};
          },
        }),

      },
    },
  },
});

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
      request,
      env,
      executionCtx,
      ...settings,
    })
  );

const fetch = (...args: any) => {

  const request = args[0];
  const path = new URL(request.url).pathname;
  if (path == "/somepath") {
    console.log("some path");
    return new Response("Hello World some path");
  };
  

  return handleSubscriptions({
    fetch: baseFetch,
    ...settings,
  })(args[0], args[1], args[2]);

};

export default { fetch };

export const WsConnectionPool = createWsConnectionPoolClass(settings);