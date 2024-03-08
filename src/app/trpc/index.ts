import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { publicProcedure, privateProcedure, router } from "./trpc";
import dbConnect from "../../lib/mongo";
import {z} from "zod"
import userModel, { TUser } from "../../models/user";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";

const clientId = process.env.NEXT_PUBLIC_KINDE_CLIENT_M2M_ID
const clientSecret = process.env.NEXT_PUBLIC_KINDE_CLIENT_M2M_SECRET


export const appRouter = router({
    apiTest: publicProcedure.query( async () => { 
        await dbConnect();
        console.log("db connected");
        return "apiTest";
    }),
    authCallback: publicProcedure.query( async () => {
        const { getUser, getPermissions } = getKindeServerSession();
        const user = (await getUser()) as any;
        const permissions = (await getPermissions()) as any;
        const organisation = permissions?.orgCode
        if (!user.id || !user.email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
          });
        }
        await dbConnect();
        // check if user exists in db collection users
        const foundUser = await userModel.findOne({email: user.email});
        if (!foundUser) {
            await userModel.create({
                email: user.email,
                username: user.given_name + user.family_name,
                team: organisation,
                company: "",
                role: "",
                image: "",
                bio: "",
                prompt: "",
                answer: ""
            })
        }
        return {
            success: true,
        }

    }),
    addUser: privateProcedure.input(
        z.object({
            email: z.string(), //from kinde
            username: z.string(), //given_name + family_name from kinde
            team: z.string(), //from kinde
            company: z.string(), //entered by manager
            role: z.string(), //entered by manager
            image: z.string(), //will be empty on initialisation
            bio: z.string(), //will be empty on initialisation
            prompt: z.string(), //will be empty on initialisation
            answer: z.string() //will be empty on initialisation
        })
    ).mutation<Promise<any>>( async ({ctx, input}) => {
        const url = 'https://kettleon.kinde.com/oauth2/token';
        const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: `${clientId}`,
                    client_secret: `${clientSecret}`,
                    audience: 'https://kettleon.kinde.com/api'
                })
        };
            const response = await fetch(url, options);
            console.log(options)
            const data = await response.json();
            console.log(data)
            console.log("token", data.access_token)
            const accessToken = data.access_token
            const authString = "Bearer " + accessToken
            const inputBody = {
                profile: {
                  given_name: e.target.given_name.value,
                  family_name: e.target.family_name.value,
                },
                organization_code: props.organisation,
                identities: [
                  {
                    type: "email",
                    details: {
                      email: e.target.email.value
                    }
                  }
                ]
              };
              console.log(inputBody)
              const headers = {
                // Content-Type:'application/json',
                Accept: "application/json",
                Authorization: authString,
                audience: "https://kettleon.kinde.com/api"
              };

            //   await fetch('https://kettleon.kinde.com/api/v1/user',
            //   {
            //     method: 'POST',
            //     body: JSON.stringify(inputBody),
            //     headers: headers
            //   })
            //   .then(function(res) {
            //       return res.json();
            //   }).then(function(body) {
            //       console.log(body);
            //   });

              const dbInputBody = {
                email: e.target.email.value,
                username: e.target.given_name.value + " " + e.target.family_name.value,
                team: props.organisation,
                company: e.target.company.value,
                role: e.target.role.value,
                image: "",
                bio: "",
                prompt: "",
                answer: ""
              }
            try {
            console.log("got to index.ts")
        const { userEmail } = ctx;
        await dbConnect();
        const foundUser = await userModel.findOne({email: userEmail});
        if (!foundUser) throw new TRPCError({code: "UNAUTHORIZED"})
        //add a user to the users collection in the database using the users model
        const user: TUser = await userModel.create({
            email: input.email,
            username: input.username,
            team: input.team,
            company: input.company,
            role: input.role,
            image: "",
            bio: "",
            prompt: "",
            answer: ""
        })
        return {user: user, success: true};
    } catch(err) {
        console.log(err)
        return {success: false}
    }
    }),
});


export type AppRouter = typeof appRouter;
