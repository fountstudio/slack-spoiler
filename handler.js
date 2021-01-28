'use strict'
const request = require('request')
const qs = require('querystring')
const utils = require('./util')
const slackUrl = 'https://slack.com'

function isEmptySlashCommand(request) {
  return !request.payload && request.text.length === 0
}

// Disable logging for production
// if (process.env.STAGE !== 'dev') {
//   console.log = function () {}
// }

// function for the inital install. We don't actually worry about any
// token, so it's just requested, but not used to make Slack happy
module.exports.auth = (event, context, callback) => {
  const response = {
    statusCode: 302,
    headers: {
      Location: 'https://spoiler.fountstudio.com/post-install',
    },
    body: '',
  }

  console.log('event' + JSON.stringify(event, true, 4))

  console.log('Incoming req params ', event.queryStringParameters)
  let options = {
    method: 'POST',
    uri: `${slackUrl}/api/oauth.v2.access`,
    // headers: {
    //   Authorization: `Bearer ${process.env.OAUTH_TOKEN}`,
    // },
    form: {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: event.queryStringParameters.code,
      scope: 'commands',
    },
  }

  request(options, (err, resp, body) => {
    if (err) {
      console.log('There was an auth error ', err)
      callback(err, null)
    }
    if (!JSON.parse(resp.body).ok) {
      console.log(resp)
      callback(body, null)
    }
    // console.log('Requesting token...');
    // NOTE: This is how we can get the Oauth bot token if needed
    // console.log('  response: ' + JSON.stringify(resp));
    // console.log('  body:     ' + JSON.stringify(body));
    callback(null, response)
  })
}

// Our command hits this function
module.exports.command = (event, context, callback) => {
  console.log('++++++++++++++++++ NEW EVENT +++++++++++++++++')
  const response = {
    statusCode: 200,
  }
  const titleRegex = /\[.*\]/

  let parsedRequest = qs.parse(event.body)
  const payload = parsedRequest.payload
    ? JSON.parse(parsedRequest.payload)
    : undefined
  let text = parsedRequest.text
  let title = ''
  const defaultTitle = 'Spoiler Alert!'
  // console.log('spoiler command invoked')
  console.log(payload)

  // User invoked via global shortcut. Show them the modal flow
  // Or they just entered the slash command without text
  if (
    isEmptySlashCommand(parsedRequest) ||
    (payload && payload.callback_id === 'spoiler_create')
  ) {
    // !payload is the slash command
    const triggerId = payload ? payload.trigger_id : parsedRequest.trigger_id
    console.log('+++ New spoiler from global shortcut')
    let json = utils.getIntroModalBlock()
    let options = {
      method: 'POST',
      uri: 'https://slack.com/api/views.open',
      json: { view: json, trigger_id: triggerId },
      headers: {
        Authorization: `Bearer ${process.env.OAUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }

    return request(options, (err, resp, body) => {
      if (err) {
        console.log('Some error occurred ' + err)
      }
      // This is a silent fail, but we really want to POST
      // a custom message that does not reveal the original
      // content
      console.log('[on create] Sending back the spoiler reveal', resp)
      if (!resp.body.ok) {
        console.log(JSON.stringify(resp.body))
      }
      callback(null, response)
    })
  }
  /** * * * * * * * * * * * * * * * *
   * VIEW SUBMISSION
   * User submitted the spoiler content
   * * * * * * * * * * * * * * * * **/

  // User invoked the shortcut and submitted the content
  // through the interactive flow
  if (payload && payload.type === 'view_submission') {
    console.log('+++ View submission')
    // console.log(JSON.stringify(payload))
    const data = utils.getDataFromSubmission(payload)
    const input = Object.assign(
      { title: 'Spoiler Alert!', hideUsername: false },
      data
    )
    const json = utils.getSubmissionResponse(input, payload)
    console.log(JSON.stringify(json))
    const responseUrl =
      payload.response_url || payload.response_urls[0].response_url
    let options = {
      method: 'POST',
      // uri: responseUrl,
      uri: payload.response_urls[0].response_url,
      json,
      headers: {
        Authorization: `Bearer ${process.env.OAUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }

    console.log(JSON.stringify(options))

    return request(options, (err, resp, body) => {
      if (err) {
        console.log('Some error occurred ' + err)
      }
      // This is a silent fail, but we really want to POST
      // a custom message that does not reveal the original
      // content
      if (!resp.body.ok) {
        console.log('[view submission] There was an error', resp.body)
        console.log(JSON.stringify(resp))
        console.log(body)
        // callback(resp.body, null)
      }
      console.log('[view submission] Sending back the spoiler reveal')
      callback(null, response)
    })
  }

  /** * * * * * * * * * * * * * * * *
   * BLOCK ACTION
   * User wants to reveal the spoiler
   * * * * * * * * * * * * * * * * **/
  if (payload && payload.type === 'block_actions') {
    const [data] = payload.actions.filter(
      (action) => action.action_id.indexOf('reveal_spoiler:') === 0
    )
    if (data) {
      const json = utils.getModalRevealBlock(data)

      let options = {
        method: 'POST',
        uri: 'https://slack.com/api/views.open',
        // uri: payload.response_url,
        json: { view: json, trigger_id: payload.trigger_id },
        headers: {
          Authorization: `Bearer ${process.env.OAUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }

      return request(options, (err, resp, body) => {
        if (err) {
          console.log('Some error occurred ' + err)
        }
        // This is a silent fail, but we really want to POST
        // a custom message that does not reveal the original
        // content
        console.log('[on reveal] Sending back the spoiler reveal', resp)
        if (!resp.body.ok) {
          console.log(JSON.stringify(resp.body))
        }
        callback(null, response)
      })
    } else {
      console.log('[block actions] there was no data match. What do we do?')
      callback(null, response)
    }
  }

  /** * * * * * * * * * * * * * * * *
   * SLASH COMMAND
   * User submitted via slash command (the old way)
   * * * * * * * * * * * * * * * * **/
  title = defaultTitle
  if (titleRegex.test(text)) {
    const titleMatch = text.match(titleRegex)
    // We can only have 24 characters max for this text input due
    // to the modal title limit
    title = titleMatch[0].slice(1, -1)
    if (title.length > 24) {
      title = title.substring(0, 20).concat('...')
    } else {
      title = title.substring(0, 24)
    }
    text = text.slice(0, text.indexOf(titleMatch)).trim()
  }

  console.log('++ SLASH COMMAND ++ ')
  console.log(JSON.stringify(parsedRequest))

  let json = {}
  if (text.toLowerCase() === 'help') {
    console.log('** HELP **')

    json = utils.getHelpText()
  } else {
    console.log('** WITH TEXT **')
    // a spoiler, the slash command method
    json = utils.getSubmissionResponse(
      { message: text, title, hideUsername: false },
      { user: { username: parsedRequest.user_name } }
    )
  }

  let options = {
    method: 'POST',
    uri: parsedRequest.response_url,
    json,
    headers: {
      Authorization: `Bearer ${process.env.OAUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }

  request(options, (err, resp, body) => {
    if (err) {
      console.log('Some error occurred ' + err)
    }
    if (!resp.body.ok) {
      console.log(JSON.stringify(resp.body))
    }
    // This is a silent fail, but we really want to POST
    // a custom message that does not reveal the original
    // content
    callback(null, response)
  })
}
