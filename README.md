
# screeps
My Screeps

Here's my attempt at coding up a Screeps. It's an es6 project transpiled down with Babel to ensure that it works and as a proof-of-concept for a babel transpile task.

To get started, run the following:

```
npm install
npm run build
nmp run deploy
```

Before deploy will fully work, there's a config file, `/screeps.js` to fill out that the deploy task creates if it cannot find it. It will hold your login credentials, so don't commit it. 

Also available is a watch job through `npm run watch`. It will continually update your code as you edit the copies in `src/`.
