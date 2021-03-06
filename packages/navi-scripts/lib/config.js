const Ajv = require('ajv')
const fs = require('fs-extra')
const path = require('path')

const ajv = new Ajv({
	allErrors: true,
	verbose: true,
});
require('ajv-keywords')(ajv, ["typeof"]);


const defaultConfig = {
  getPagePathname: ({ url }) => {
    return url === '/' ? 'index.html' : path.join(url.pathname.slice(1), 'index.html')
  },
  renderRedirectToString: ({ to }) => {
    return `<meta http-equiv="refresh" content="0; URL='${to}'" />`
  },
  getRedirectPathname: ({ url }) => {
    return url === '/' ? 'index.html' : path.join(url.pathname.slice(1), 'index.html')
  },
  context: {},
  root: 'build',
  entry: 'build/index.html',
  appGlobal: 'NaviApp',
  fs: {
    readFile: (pathname) => fs.readFile(pathname, "utf8"),
    writeFile: fs.writeFile,
    ensureDir: fs.ensureDir,
    exists: fs.exists,
  },
}

const configSchema = {
  type: "object",
  additionalProperties: false,
  required: ['entry', 'renderPageToString'],
  properties: {
    root: {
      description: `The directory that all files will be read from and written to.`,
      type: 'string',
    },
    entry: {
      description: `The file that sets "window.$exports", relative to root.`,
      type: 'string',
    },
    context: {
      description: `The routing context that will be used when building a site map.`,
    },
    
    appGlobal: {
      description: `The property of the "window" object where your entry file places its exports.`,
      type: 'string',
    },
    renderPageToString: {
      description: `A function that accepts an { $exports, url, siteMap, dependencies } object, and returns the page's contents as a string.`,
      typeof: 'function',
    },
    getPagePathname: {
      description: `A function that accepts an { $exports, url, siteMap } object, and returns the path under the root directory where the page's contents will be written to.`,
      typeof: 'function',
    },
    renderRedirectToString: {
      description: `An optional function that accepts an { $exports, url, siteMap, to } object, and returns the redirect file's contents as a string.`,
      typeof: ['undefined', 'function'],
    },
    getRedirectPathname: {
      description: `An optional function that accepts an { $exports, url, siteMap } object, and returns the path under the root directory where the page's contents will be written to.`,
      typeof: ['undefined', 'function'],
    },
    fs: {
      type: "object",
      properties: {
        readFile: {
          description: `The function that will be used to read script files`,
          typeof: 'function',
        },
        writeFile: {
          description: `The function that will be used to write output files`,
          typeof: 'function',
        },
        ensureDir: {
          description: `The function that will be used to create directories before writing to them`,
          typeof: 'function',
        },
        exists: {
          description: `The function that will be used to check if a file or directory exists`,
          typeof: 'function',
        },
      },
    },
  }
}

async function processConfig(config) {
  config = Object.assign(
    {},
    defaultConfig,
    {
      ...config,
      fs: {
        ...defaultConfig.fs,
        ...config.fs,
      }
    }
  )

  if (!config.renderPageToString) {
    let reactNaviCreateReactApp
    try {
      reactNaviCreateReactApp = require('react-navi/create-react-app')
    }
    catch (e) {}

    if (reactNaviCreateReactApp) {
      console.log('Using create-react-app renderer...')

      const Navi = require('navi')
      const React = require('react')
      const ReactDOMServer = require('react-dom/server')
      const he = require('he')
      
      config.renderPageToString = async function renderPageToString({ exports, pages, siteMap, url }) {
        let navigation = Navi.createMemoryNavigation({ pages, url })
        let { route } = await navigation.getSteadyValue()

        return reactNaviCreateReactApp.renderCreateReactAppTemplate({
          insertIntoRootDiv:
            ReactDOMServer.renderToString(
              React.createElement(exports, {
                navigation,
                siteMap,
              })
            ),
          replaceTitleWith:
            `\n<title>${route.title || 'Untitled'}</title>\n` +
            Object.entries(route.meta || {}).map(([key, value]) =>
              `<meta name="${he.encode(key)}" content="${he.encode(value)}" />`
            ).concat('').join('\n'),
        })
      }
    }
  }

  if (!ajv.validate(configSchema, config)) {
    throw new Error(ajv.errorsText())
  }

  let exists = config.fs.exists
  let entry = path.resolve(config.root, config.entry)

  if (!(await exists(entry))) {
    throw new Error(`Could not read the entry file "${entry}".`)
  }

  return Object.freeze(config)
}


module.exports = {
  processConfig,
  configSchema,
  defaultConfig,
}