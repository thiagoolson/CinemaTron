const Airtable = require('airtable')
const bcrypt = require('bcryptjs')
// const clientSessions = require('client-sessions')

/** 
 * The following lines refer to environment variables.
 * These are configured online in Netlify settings (found in "Site settings > Build & deploy > Environment" as of this writing)
 * For local development via Netlify CLI, they go in netlify.toml under "[build.environment]"
 */
const {
	AIRTABLE_API_KEY,
	AIRTABLE_BASE_ID,
	CLIENT_SESSIONS_SECRET,
	TESTUSER_RECORD_ID
} = process.env
const at_base = new Airtable({
		apiKey: AIRTABLE_API_KEY
	})
	.base(AIRTABLE_BASE_ID)
const at_table_users = at_base('users')

exports.handler = (event, context, callback) => {

	/* console.log('event: ')
	console.log(event) */

	var doSeshChk = false
	const req_cooks = event.headers['cookie']
	if (typeof req_cooks !== 'undefined') {
		doSeshChk = true

		var req_cooks_arr = req_cooks.split(';')
			.map( itm => itm.trim() )
			.map( itm => {
				var arr = itm.split('=')
				return {
					cooknom: arr[0],
					cookval: arr[1]
				}
			})
	}
	
	function doHash (val_to_hash) {

		console.log('doHash val_to_hash: ')
		console.log(val_to_hash)

		return new Promise( (resolve, reject) => {
			bcrypt.hash(val_to_hash, 10, function (err, hash) {
				if (err) {
					console.error(err)
					reject(err)
				}
				else {
					resolve({
						hash: hash
					})
				}
			})
		})
	}

	function storeHash (inFld, hash) {

		console.log('storeHash inFld: ')
		console.log(inFld)

		console.log('storeHash hash: ')
		console.log(hash)

		console.log('storeHash TESTUSER_RECORD_ID: ')
		console.log(TESTUSER_RECORD_ID)

		const hashStoreObj = {}
		hashStoreObj[inFld] = hash

		return new Promise( (resolve, reject) => {
			at_table_users.update(
				TESTUSER_RECORD_ID,
				hashStoreObj,
				function (err, record) {
					if (err) {
						console.error(err)
						reject(err)
					} else {
						resolve(record)
					}
				}
			)
		})
	}

	function getUsers (byFld, fldVal) {
		const filterFormula = "({" + byFld + "} = '" + fldVal + "')"

		return new Promise( (resolve, reject) => {
			at_table_users.select({
				maxRecords: 10,
				filterByFormula: filterFormula
			})
			.firstPage( function (err, records) {
				if (err) {
					console.error(err)
					reject(err)
				}
				
				resolve(records)
			})
		})
	}

	if (event.httpMethod !== 'GET') {
		const req_obj = JSON.parse(event.body)
		var { auth_task, auth_eml, auth_pw } = req_obj
	} else {
		var auth_task = 'auth_check'
	}

	switch (auth_task) {
		case 'auth_check': {
			if (doSeshChk) {
				const cinesesh_str = req_cooks_arr.find( itm => itm.cooknom == 'cinesesh' )

				console.log('cinesesh_str.cookval: ')
				console.log(cinesesh_str.cookval)

				getUsers('sesh', cinesesh_str.cookval)
				.then( resp => {
					if (resp.length > 0) {
						callback(null, {
							statusCode: 200,
							headers: {'Content-Type': 'application/json'},
							body: JSON.stringify(resp)
						})
					} else {
						callback(null, {
							statusCode: 401,
							headers: {'Content-Type': 'application/json'},
							body: JSON.stringify([{validSesh: false}])
						})
					}
				})
				.catch( function (errObj) {
					
					console.error(errObj);
			
					callback({
						statusCode: errObj.statusCode,
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(errObj)
					})
				})
			} else {
				callback(null, {
					statusCode: 401,
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify([{validSesh: false}])
				})
			}
		break;
		}
		case 'auth_login':

			console.log('oh, you wanna log in')
			
			getUsers('email', auth_eml)
			.then( users => {

				/* console.log('then users: ')
				console.log(users) */

				if ( users.length > 0) {
					users.forEach( function (userObj) {
						bcrypt.compare(auth_pw, userObj.get("pwhash") )
						.then( matched => {
							if (matched) {
								/** Password is good! */
								
								console.log('userObj.fields: ')
								console.log(userObj.fields)
								
								let resp = {
									'message': 'User is confirmed'
								}

								/* clientSessions({
									cookieName: 'cinesesh',
									secret: CLIENT_SESSIONS_SECRET,
									duration: 24 * 60 * 60 * 1000,
									activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
								}) */

								let val_to_hash = Date.now()
								val_to_hash = val_to_hash.toString()

								doHash(val_to_hash)
								.then( function (hashObj) {
		
									console.log('then hashObj: ')
									console.log(hashObj)
							
									console.log('hashObj.hash: ')
									console.log(hashObj.hash)
							
									return storeHash('sesh', hashObj.hash);
								})					
								.then( function (resp) {

									// console.log('sesh store good')

									// console.log('resp: ')
									// console.log(resp)

									callback(null, {
										statusCode: 200,
										headers: { 
											'Content-Type': 'application/json',
											'Set-Cookie': 'cinesesh=' + resp.fields['sesh'] + ';path=/;HttpOnly'
										},
										body: JSON.stringify(resp)
									})
								})
								.catch( function (errObj) {
							
									console.error(errObj);
							
									callback({
										statusCode: errObj.statusCode,
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify(errObj)
									})
								})
							} else {
								/** Password fail */
	
								console.log('Password fail')
								
								let resp = {
									'statusCode': 401,
									'error': 'Incorrect Password',
									'message': 'Password is incorrect'
								}

								callback(null, {
									statusCode: 401,
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify(resp)
								})
							}
						})
					})
				} else {
					/** User not found */
	
					console.log('User not found')
					
					let resp = {
						'statusCode': 401,
						'error': 'User Not Found',
						'message': 'That user was not found'
					}
					
					callback(null, {
						statusCode: 401,
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(resp)
					})
				}
			})
			.catch( errObj => {
				
				console.log('Catch happens')
				console.error(errObj);
		
				callback(null, {
					statusCode: errObj.statusCode,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(errObj)
				})
			})
		break;
		case 'auth_pw_set': {
			const val_to_hash = auth_pw
			doHash(val_to_hash)
			.then( function (hashObj) {
		
				console.log('then hashObj: ')
				console.log(hashObj)
		
				console.log('hashObj.hash: ')
				console.log(hashObj.hash)
		
				return storeHash('pwhash', hashObj.hash);
			})
			.then( function (resp) {
				
				console.log('resp: ')
				console.log(resp)
				
				callback(null, {
					statusCode: 200,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(resp)
				})
			})
			.catch( function (errObj) {
		
				console.error(errObj);
		
				callback({
					statusCode: errObj.statusCode,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(errObj)
				})
			})
		break;
		}
	}
}
