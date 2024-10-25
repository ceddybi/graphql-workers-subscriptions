import { SubscribePayload } from "graphql-ws2";

export interface Subscription {
  id: string;
  connectionPoolId: string;
  connectionId: string;
  filter?: any;
  subscription: SubscribePayload;
  topic: string;
}
