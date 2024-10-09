import "reflect-metadata";
import { Resolver, Query, Mutation, Subscription, Arg, PubSub, Ctx, ObjectType, Field, buildSchemaSync } from "type-graphql";
import { createPubSub } from "@graphql-yoga/subscription";

@ObjectType()
class Greeting {

  @Field(type => String)
  greeting?: String;
}

@Resolver()
class PingResolver {
  @Query(() => String)
  ping() {
    return "pong";
  }
}

@Resolver()
class GreetResolver {
  @Mutation(() => String)
  async greet(
    @Arg("greeting", () => String, { nullable: false }) greeting: string,
    @Ctx() context: any
  ): Promise<string> {
    console.log("context:", context);
    await context.publish("GREETINGS", { greetings: { greeting } });
    return "ok";
  }
}

@Resolver()
class GreetingsResolver {
  @Subscription(() => Greeting,
    {
      topics: "GREETINGS",
      filter: ({ payload, args }) => {
        return args.greeting ? payload.greetings.greeting === args.greeting : true;
      },
    }
  )
  greetings(@Arg("greeting", () => String, { nullable: true }) greeting: string) {
    return { greeting };
  }
}

export const pubSub = createPubSub<{
  GREETINGS: [Greeting];
}>();

export const schema = buildSchemaSync({
  pubSub,
  resolvers: [PingResolver, GreetResolver, GreetingsResolver],
});