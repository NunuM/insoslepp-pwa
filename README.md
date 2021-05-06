# PWA Skeleton with backend in NodeJS

![InSoSleep](https://i.ibb.co/pX7KrKX/Screenshot-2021-05-06-at-23-23-26.png)

### Features

* Push Notifications
* Almost Native Look&Feel
* Offline Content
* Audio Player
* Base ER model so that you can build your next app
* Flexible API
* Admin UI
* SEO Ready

### Server Setup

Generate VAPID key pair

```bash
npm install web-push -g
web-push generate-vapid-keys --json
```

Copy those keys to [backend configs](backen/config.json) and change configs to your convenience, inculsive database.

The email is not required to work.

```bash
cd backend
npm i
# with database already defined in the config
npm run migrator 00
npm run migrator 01
npm start # default port 3000 http://localhost:3000/admin/posts/
```
### WebApp

On [environment]() fill the vapi with the public key.


### REST API

path | method | privileges | paylaod | description
--- | --- | --- | --- | ---
/api/categories | GET | user/anonymous |  - | Get all categories
/api/wall/suggestion?q= | GET | user/anonymous | - | Full text search on title,description and body
/api/wall?q=''&cat=all&order=id&p=0 | GET | user/anonymous | - | Obtain wall page. The query params on the path are the default ones
/api/post/:id | GET | user/anonymous | - | Obtain post by id
/posts/:id/liked | POST | user | {liked:boolean} | User liked or not the post
/posts/:id/seen | POST | user | {} | Mark post as seen by the user
/posts/:id/live | POST | user | {play:boolean} | Is user currently listeneing this post audio
/api/users | POST | anonymous | {sub?:object} | Register's user. The sub, is the JSON that you get when user allos to receive push notifications
/api/users | PUT | user | {sub:object} | Update user PubSubSubscription
/api/info/:id | GET | user/anonymous | - | Pushes audio content related to the post
/api/info/:id | POST | user/anonymous | {} | Request where the audio is located for this post
/api/sitemap | GET | user/anonymous | - | Get's website sitemap used for SEO
/api/push/:post?userId=all | POST | admin | - | Send push notification based on this post to all users, unsless you specify the user in query parameter
/api/bugs/ | POST | user/anonymous | {message:string} | Saves bu report

If your application do not allow anonymous interactions, you can change the [middleware](backend/src/utils.js)

### ER

This is a base ER that you can start build your application.

![ER model](https://i.ibb.co/bNbcgFh/Screenshot-2021-05-06-at-23-14-23.png)


# Admin UI site

