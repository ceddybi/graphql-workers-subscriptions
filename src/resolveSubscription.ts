import { parse } from "graphql";
import type { SubscribePseudoIterable, PubSubEvent } from "./types";
import {
  buildExecutionContext,
  ExecutionContext,
} from "./graphqlInternals";
import { getResolverAndArgs } from "./getResolverAndArgs";
import { GraphQLSchema } from "graphql";
import { SubscribeMessage } from "graphql-ws2";
import { Subscription } from "./subscription";

export const resolveSubscription = async (
  message: SubscribeMessage,
  schema: GraphQLSchema,
  connectionId: string,
  connectionPoolId: string
): Promise<Subscription> => {
  // extract subscription related values based on schema
  const execContext = buildExecutionContext({
    schema,
    document: parse(message.payload.query),
    variableValues: message.payload.variables,
    operationName: message.payload.operationName,
  });
  if (isErrorArray(execContext)) {
    console.error(execContext.map((e) => e.message));
    throw new Error("GraphQL buildExecutionContext error", { cause: execContext[0] });
  }
  const { field, root, args, context, info } = getResolverAndArgs({
    execContext,
  });

  if (!field) {
    throw new Error("No field");
  }

  const { topic, filter: filterFn } =
    field.subscribe as SubscribePseudoIterable<PubSubEvent>;

  if (!topic) {
    throw new Error("No topic found on subscribe field. Make sure to use subscribe correctly.");
  }

  // execute filter callback if defined (return filter data saved to D1)
  const filter =
    typeof filterFn === "function"
      ? filterFn(root, args, context, info)
      : filterFn;

  const subscription: Subscription = {
    id: message.id,
    connectionPoolId,
    connectionId,
    subscription: message.payload,
    topic,
    filter,
  };

  return subscription;
};

const isErrorArray = (e: any): e is readonly any[] => Array.isArray(e);
