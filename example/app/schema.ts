import "reflect-metadata";
import { Resolver, Query, Mutation, Subscription, Arg, PubSub, Ctx, ObjectType, Field, buildSchemaSync, buildTypeDefsAndResolversSync, MiddlewareFn, UseMiddleware } from "type-graphql";
import { createPubSub } from "@graphql-yoga/subscription";
// import {UserResolverPublic, UserAuthResolver, getAuthResolvers} from "@roadmanjs/auth"
// import { getChatResolvers } from "@roadmanjs/chat";
export const isAuth: MiddlewareFn<any> = ({context}, next) => {
  // const authorization = _get(context, 'req.headers.authorization', '');

  // throw new Error('not authenticated');

  return next();
};

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
  @UseMiddleware(isAuth)
  async greet(
    @Arg("greeting", () => String, { nullable: false }) greeting: string,
    @Ctx() context: any
  ): Promise<string> {
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
  greetings(@Arg("greeting", () => String, { nullable: false }) greeting: string) {
    return { greeting };
  }
}

export const pubSub = createPubSub<{
  GREETINGS: [Greeting];
}>();


// const resolvers = [
//   UserAuthResolver,
//   // PushResolver,
//   ...getAuthResolvers(),
//   ...getChatResolvers(),
//   // ...getMediaFileUploadResolvers(),
// ];

export const typeDefsAndResolvers = buildTypeDefsAndResolversSync({
  pubSub,
  resolvers: [PingResolver, GreetResolver, GreetingsResolver],
})

// export const schema = buildSchemaSync({
//   pubSub,
//   resolvers: [PingResolver, GreetResolver, GreetingsResolver],
// });