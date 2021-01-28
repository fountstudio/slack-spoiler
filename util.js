// TODO: NOT DRY AT ALL
const TITLE_INPUT = 'title_input'
const TITLE_INPUT_ACTION = `title_input_action`
const MESSAGE_INPUT = 'message_input'
const MESSAGE_INPUT_ACTION = 'message_input_action'
const OPTIONS = 'options'
const OPTION_HIDE_USERNAME = 'value_hide_name'
const OPTION_HIDE_USERNAME_ACTION = 'value_hide_name_action'
const CONVERSATION_SELECT = 'value_conversation'
const CONVERSATION_SELECT_ACTION = 'value_conversation_action'
const textInputOptions = [TITLE_INPUT_ACTION, MESSAGE_INPUT_ACTION]
const checkboxInputOptions = [OPTION_HIDE_USERNAME_ACTION]
const valueKeyMap = {
  [`${TITLE_INPUT_ACTION}`]: 'title',
  [`${MESSAGE_INPUT_ACTION}`]: 'message',
  [`${OPTION_HIDE_USERNAME_ACTION}`]: 'hideUsername',
}

function getIntroModalBlock() {
  return {
    title: {
      type: 'plain_text',
      text: 'Create Spoiler',
    },
    submit: {
      type: 'plain_text',
      text: 'Submit',
    },
    blocks: [
      {
        type: 'input',
        block_id: TITLE_INPUT,
        optional: true,
        element: {
          type: 'plain_text_input',
          max_length: 24,
          action_id: TITLE_INPUT_ACTION,
          placeholder: {
            type: 'plain_text',
            text: 'Title',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Title',
        },
        hint: {
          type: 'plain_text',
          text:
            'The title will be shown as a teaser to the spoiler content. Leave blank to use the default text: "Spoiler Alert!"',
        },
      },
      {
        type: 'input',
        block_id: MESSAGE_INPUT,
        element: {
          type: 'plain_text_input',
          max_length: 1990,
          action_id: MESSAGE_INPUT_ACTION,
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Enter your spoiler here',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Content',
        },
        hint: {
          type: 'plain_text',
          text: 'Hint text',
        },
      },
      {
        block_id: CONVERSATION_SELECT,
        type: 'input',
        optional: false,
        label: {
          type: 'plain_text',
          text: 'Select a channel to post the spoiler on',
        },
        element: {
          action_id: CONVERSATION_SELECT_ACTION,
          type: 'conversations_select',
          response_url_enabled: true,
          default_to_current_conversation: true,
        },
      },
      {
        type: 'input',
        block_id: OPTIONS,
        optional: true,
        element: {
          type: 'checkboxes',
          options: [
            {
              text: {
                type: 'plain_text',
                text: 'Hide my username',
              },
              value: OPTION_HIDE_USERNAME_ACTION,
            },
          ],
        },
        label: {
          type: 'plain_text',
          text: 'Options',
        },
      },
    ],
    type: 'modal',
  }
}

function getOpenMessage({ title, text }) {
  return {
    response_type: 'in_channel',
    replace_original: false,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: title,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: text,
        },
      },
    ],
  }
}

function getDataFromSubmission({ view }) {
  const data = view.blocks.map(({ block_id, element }) => ({
    block_id,
    action_id: element.action_id,
  }))
  const { values } = view.state
  let response = {}
  console.log(JSON.stringify(values))
  console.log({ data })
  data.forEach((item) => {
    // console.log('item', item)
    const value = values[item.block_id]
    if (!value) return
    // TODO: Maybe we can use the same string for block_id and action_id
    const key = valueKeyMap[item.action_id]
    // console.log({ key, value })
    if (textInputOptions.includes(item.action_id)) {
      // console.log('We have a text input')
      response[key] = value[item.action_id].value
    } else if (item.block_id === OPTIONS) {
      // Assume these are options
      const valueObject = value[item.action_id]
      if (valueObject.type === 'checkboxes' && valueObject.selected_options) {
        // console.log(valueObject)
        // If checked, the result should return
        valueObject.selected_options
          .map((i) => i.value)
          .forEach((item) => {
            response[valueKeyMap[item]] = true
          })
      }
    }
  })
  console.log({ response })
  Object.keys(response).forEach(
    (key) => response[key] == undefined && delete response[key]
  )
  return response
}

function getHelpText() {
  return {
    text: 'Spoiler Help',
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ' :information_source: User Guide',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '*Usage* Use the global shortcut to enter the interactive flow or type `/spoiler`. Use the interactive flow for more options.',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ' `/spoiler` *Slash Command Examples*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '> Default usage: type `/spoiler money does not grow on trees` (1990 characters allowed).',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '>With title: type `/spoiler money does not grow on trees [where does money grow?]` (1990 characters max for content [24 for the title]).',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text:
              'Visit https://spoiler.fountstudio.com for more help or email us at crew@fountstudio.com',
          },
        ],
      },
    ],
  }
}

function getSubmissionResponse({ title, message, hideUsername }, payload) {
  let response = {
    response_type: 'in_channel',
    text: 'Spoiler Alert!',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: title,
          // emoji: true,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Reveal',
              // emoji: true,
            },
            action_id: `reveal_spoiler:${title}`, // A hack to allow the full content to fit in the value field
            value: JSON.stringify({ text: message }),
          },
        ],
      },
    ],
  }
  if (!hideUsername) {
    response.blocks.unshift({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          // emoji: true,
          text: `*Posted by:* ${payload.user.username || payload.user.name}!`,
        },
      ],
    })
  }

  return response
}

/**
 * This produces the modal block that contains the revealed
 * spoiler content. Note that Slack limits the title block
 * to 25 characters.
 * @param {*} data
 */
function getModalRevealBlock(data) {
  return {
    title: {
      type: 'plain_text',
      text: data.action_id.split('reveal_spoiler:').pop(),
    },

    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: JSON.parse(data.value).text,
          // text: data.value,
        },
      },
    ],
    type: 'modal',
  }
}

module.exports = {
  getIntroModalBlock,
  getModalRevealBlock,
  getDataFromSubmission,
  getOpenMessage,
  getSubmissionResponse,
  getHelpText,
}
