const { BaseKonnector, requestFactory, log } = require('cozy-konnector-libs')
const CozyBrowser = require('cozy-konnector-libs/dist/libs/CozyBrowser')
const browser = new CozyBrowser()
const VENDOR = 'MGC'
const baseUrl = 'https://monespacepersonnel.cimut.net/web/mgc'
const baseUrlConnected = 'https://monespacepersonnel.cimut.net/group/mgc'

module.exports = new BaseKonnector(fetch)

async function fetch(fields) {
  log('info', 'Authenticating ...')
  await authenticate(fields.login, fields.password)
  log('info', 'Successfully logged in')

  log('info', 'Fetching the list of documents')
  await visit(`${baseUrlConnected}/mes-remboursements`)
  const documents = await parseDocuments()

  var cookieHeader = browser.cookies.serialize(
    'monespacepersonnel.cimut.net',
    '/'
  )
  const request_cookies = requestFactory({
    headers: { Cookie: cookieHeader }
  })

  await this.saveBills(documents, fields.folderPath, {
    requestInstance: request_cookies,
    identifiers: ['Mgc']
  })
}

async function visit(url) {
  return new Promise(resolve => {
    browser.visit(url, () => {
      resolve()
    })
  })
}

async function pressButton(sel) {
  return new Promise(resolve => {
    browser.pressButton(sel, () => {
      resolve()
    })
  })
}

// This shows authentication using the [signin function](https://github.com/konnectors/libs/blob/master/packages/cozy-konnector-libs/docs/api.md#module_signin)
// even if this in another domain here, but it works as an example
async function authenticate(username, password) {
  await visit(`${baseUrl}`)
  browser.fill('#login', username)
  browser.fill('#password', password)
  await pressButton('Je me connecte')
  if (!browser.redirected || browser.location.pathname != '/group/mgc') {
    throw new Error('LOGIN_FAILED')
  }
}

function parseDocuments() {
  var nodes = browser.evaluate(
    'document.querySelectorAll("a.remboursements__month__pdf")'
  )
  var documents = []
  for (var i = 0; i < nodes.length; i++) {
    var date = extractDate(nodes[i].title.match(/[0-9/]+$/)[0])
    var id = nodes[i].href.match(/[0-9]+$/)[0]
    documents.push({
      fileurl: nodes[i].href,
      vendor: VENDOR,
      vendorRef: id,
      date: new Date(date + '-01'),
      filename: `${date}_${id}.pdf`,
      currency: '€',
      amount: 10
    })
  }

  return documents
}

function extractDate(title) {
  return title.replace(/^([0-9]+)\/([0-9]+)/, '$2-$1')
}
