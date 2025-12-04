import { getSession } from "@auth/express";
import { authConfig } from "../auth.config.js";




export async function authenticatedUser(req, res, next){

    const  session = res.locals.session || (await getSession(req, authConfig));

    if(session){
        return next()
    }

    return res.status(401).json({message: "Not Authenticated"})

}


export async function currentSession(req, res, next){
    const session = (await getSession(req, authConfig)) || undefined;
    res.locals.session = session
    return next()
}