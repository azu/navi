/**
 * An object that store the parts of a URL that can correspond to a
 * a specific screen within your application.
 */
export type URLDescriptor = {
  pathname: string,
  search: string,
  hash: string,
  query: Params,
  href: string,

  state?: object,
}

export type Params = {
  [name: string]: string
}

export function areURLDescriptorsEqual(x?: URLDescriptor, y?: URLDescriptor): boolean {
  if (x == y) {
      return true
  }
  else if (!x || !y) {
      return false
  }
  return (
    x.pathname == y.pathname &&
    x.search == y.search &&
    x.hash == y.hash && 
    x.state == y.state
  )
}

const parsePattern = /((((\/?(?:[^\/\?#]+\/+)*)([^\?#]*)))?(\?[^#]+)?)(#.*)?/
export function createURLDescriptor(urlOrDescriptor: string | Partial<URLDescriptor>, { ensureTrailingSlash = true } = {}): URLDescriptor {
  let url: URLDescriptor
  let pathname: string
  let query: Params
  let search: string
  let hash: string
  let state: any
  if (typeof urlOrDescriptor === 'string') {
    let matches = parsePattern.exec(urlOrDescriptor)
    if (!matches) {
        throw new Error("Couldn't parse the provided URL.")
    }
    pathname = matches[2] || ''
    search = matches[6] || ''
    query = parseQuery(search)
    hash = matches[7] || ''
  }
  else {
    pathname = urlOrDescriptor.pathname || ''
    query = urlOrDescriptor.query || (urlOrDescriptor.search ? parseQuery(urlOrDescriptor.search) : {})
    search = urlOrDescriptor.search || stringifyQuery(query)
    hash = urlOrDescriptor.hash || ''
    state = urlOrDescriptor.state
  }
  if (ensureTrailingSlash && pathname.length && pathname.substr(-1) !== '/') {
    pathname += '/'
  }
  return url = {
    pathname,
    query,
    search,
    hash,
    href: pathname+search+hash,
    state,
  }
}

export function parseQuery(queryString?: string, leadingCharacter='?'): Params {
  if (!queryString || queryString[0] != leadingCharacter) {
      return {}
  }

  let query = {}
  let queryParts = queryString.slice(1).split('&')
  for (let i = 0, len = queryParts.length; i < len; i++) {
      const x = queryParts[i].split('=')
      query[x[0]] = x[1] ? decodeURIComponent(x[1]) : ''
  }
  return query
}

export function stringifyQuery(query: { [name: string]: any }, leadingCharacter='?') {
  let keys = Object.keys(query)
  if (keys.length === 0) {
    return ''
  }

  let parts: string[] = []
  for (let i = 0, len = keys.length; i < len; i++) {
    let key = keys[i]
    let value = String(query[key])
    parts.push(value === '' ? key : key+'='+encodeURIComponent(value))
  }

  return leadingCharacter + parts.join('&')
}

export function joinPaths(a, b) {
  if (!b) {
      return a
  }
  if (a[a.length-1] === '/') {
      a = a.substr(0, a.length - 1)
  }
  if (b[0] === '/') {
      b = b.substr(1)
  }
  return a + '/' + b
}