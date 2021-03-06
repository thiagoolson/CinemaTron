# Cinematron
Just a little JAMstack demo site for code exercise.

## Deploy Status
[![Netlify Status](https://api.netlify.com/api/v1/badges/414442f0-579c-41c1-82f3-ff486fd0180e/deploy-status)](https://app.netlify.com/sites/cinematron/deploys)

## Project info
- HTML
- CSS via [Sass](https://sass-lang.com/)
- JS (primarily as [jQuery](https://jquery.com) in the front-end, although with gradually increasing amounts of vanilla)
- [Gulp](https://gulpjs.com/) for build/taskrunner
- [Netlify](https://www.netlify.com/) for continuous deployment from this repo (plus hosting)
- Node for API endpoints via [Netlify Functions](https://www.netlify.com/docs/functions/)
- [Airtable](https://airtable.com/invite/r/0Rumimlc) <small>(<-- referral link)</small> for datastore
	- If you're looking for a solution to wiring up a Netlify site to Airtable via Node, see https://github.com/scottbram/CinemaTron/blob/prod/functions/at_api.js
