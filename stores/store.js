/* eslint-disable global-require */
const debug = require('debug')('citizen:server:store');

let store;

const init = (dbType) => {
  const t = dbType || process.env.CITIZEN_DATABASE;
  if (t === 'mongodb') {
    store = require('./mongodb');
  } else {
    store = require('./nedb');
  }
};

const getStoreType = () => store.storeType;

// modules
const moduleDb = () => store.moduleDb;

const saveModule = async (data) => {
  const {
    namespace,
    name,
    provider,
    version,
    owner,
    location,
    definition = {},
  } = data;

  const module = {
    owner: owner || '',
    namespace,
    name,
    provider,
    version,
    location,
    ...definition,
  };

  const m = await store.saveModule(module);
  debug('saved the module into store: %o', module);
  return m;
};

const findAllModules = async ({
  selector = {},
  namespace = '',
  provider = '',
  offset = 0,
  limit = 15,
} = {}) => {
  const options = selector;

  if (namespace) {
    options.namespace = namespace;
  }
  if (provider) {
    options.provider = provider;
  }
  debug('search store with %o', options);

  const modules = await store.findModules(options);
  const totalRows = modules.length;
  const meta = {
    limit: +limit,
    currentOffset: +offset,
    nextOffset: +offset + +limit,
    prevOffset: +offset - +limit,
  };
  if (meta.prevOffset < 0) { meta.prevOffset = null; }
  if (meta.nextOffset >= totalRows) { meta.nextOffset = null; }

  const result = await store.findAllModules(options, meta, +offset, +limit);
  return result;
};

const getModuleVersions = async ({ namespace, name, provider } = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }

  const options = {
    namespace,
    name,
    provider,
  };

  debug('search versions in store with %o', options);
  const docs = await store.getModuleVersions(options);

  const result = docs.map((d) => ({
    version: d.version,
    submodules: d.submodules,
    root: d.root,
  }));
  debug('search versions result from store: %o', docs);
  return result;
};

const getModuleLatestVersion = async ({ namespace, name, provider } = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }

  const options = {
    namespace,
    name,
    provider,
  };

  const result = await store.getModuleLatestVersion(options);
  return result;
};

const findOneModule = async ({
  namespace,
  name,
  provider,
  version,
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }
  if (!version) { throw new Error('version required.'); }

  const options = {
    namespace,
    name,
    provider,
    version,
  };

  debug('search a module in store with %o', options);
  const result = await store.findOneModule(options);
  return result;
};

const increaseModuleDownload = async ({
  namespace,
  name,
  provider,
  version,
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }
  if (!version) { throw new Error('version required.'); }

  const options = {
    namespace,
    name,
    provider,
    version,
  };

  const result = await store.increaseModuleDownload(options);
  return result;
};

// providers
const providerDb = () => store.providerDb;

const saveProvider = async (data) => {
  const p = {
    namespace: data.namespace,
    type: data.type,
    version: data.version,
    platforms: [],
  };

  if (data.platforms && data.platforms.length > 0) {
    data.platforms.forEach((platform) => {
      p.platforms.push({
        os: platform.os,
        arch: platform.arch,
        location: platform.location,
        filename: platform.filename,
        shasum: platform.shasum,
      });
    });
  }

  const result = await store.saveProvider(p);
  return result;
};

// TODO: check if this is needed
const findAllProviders = async ({
  selector = {},
  namespace = '',
  type = '',
  offset = 0,
  limit = 15,
} = {}) => {
  const options = selector;

  if (namespace) {
    options.namespace = namespace;
  }
  if (type) {
    options.type = type;
  }
  debug('search store with %o', options);

  const providers = await store.findProviders(options);
  const totalRows = providers.length;
  const meta = {
    limit: +limit,
    currentOffset: +offset,
    nextOffset: +offset + +limit,
    prevOffset: +offset - +limit,
  };
  if (meta.prevOffset < 0) { meta.prevOffset = null; }
  if (meta.nextOffset >= totalRows) { meta.nextOffset = null; }

  const result = await store.findAllProviders(options, meta, +offset, +limit);
  return result;
};

const getProviderVersions = async ({ namespace, type } = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!type) { throw new Error('type required.'); }

  const options = {
    namespace,
    type,
  };

  debug('search versions in store with %o', options);
  const docs = await store.getProviderVersions(options);

  if (docs.length > 0) {
    const result = {
      id: `${docs[0].namespace}/${docs[0].type}`,
      versions: [],
    };

    // FIXME: to match official API response
    result.versions = docs.map((d) => ({
      version: d.version,
      // FIXME: what is protocols
      protocols: [],
      platforms: d.platforms.map((p) => ({
        os: p.os,
        arch: p.arch,
      })),
    }));
    debug('search provider versions result from store: %o', result);

    return result;
  }

  return {};
};

// FIXME: return correct response format
const findProviderPackage = async ({
  namespace = '',
  type = '',
  version = '',
  os = '',
  arch = '',
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!type) { throw new Error('type required.'); }
  if (!version) { throw new Error('version required.'); }
  if (!os) { throw new Error('os required.'); }
  if (!arch) { throw new Error('arch required.'); }

  const options = {
    namespace,
    type,
    version,
    'platforms.os': os,
    'platforms.arch': arch,
  };

  debug('search a provider store with %o', options);
  const result = await store.findProviderPackage(options);
  return result;
};

// publishers
// TODO: add tests and check if it needed
const publisherDb = () => store.publisherDb;

const savePublisher = async (data) => {
  const {
    name,
    url,
    trustSignature,
    gpgKeys,
  } = data;

  if (!name) { throw new Error('name required.'); }
  if (!gpgKeys) { throw new Error('gpgKeys required.'); }

  for (let i = 0; i < gpgKeys.length; i += 1) {
    if (!gpgKeys[i].keyId) {
      throw new Error(`gpgKeys[${i}].keyId required.`);
    }
    if (!gpgKeys[i].asciiArmor) {
      throw new Error(`gpgKeys[${i}].asciiArmor required.`);
    }
  }

  const p = {
    name,
    url,
    trustSignature,
    gpgKeys,
  };

  const result = await store.savePublisher(p);
  return result;
};

const updatePublisher = async (data) => {
  debug('update a publisher with %o', data);
  const result = await store.updatePublisher(data);
  return result;
};

const findAllPublishers = async ({
  selector = {},
  offset = 0,
  limit = 15,
} = {}) => {
  const options = selector;

  debug('search store with %o', options);

  const publishers = await store.findPublishers(options);
  const totalRows = publishers.length;
  const meta = {
    limit: +limit,
    currentOffset: +offset,
    nextOffset: +offset + +limit,
    prevOffset: +offset - +limit,
  };
  if (meta.prevOffset < 0) { meta.prevOffset = null; }
  if (meta.nextOffset >= totalRows) { meta.nextOffset = null; }

  const result = await store.findAllPublishers(options, meta, +offset, +limit);
  return result;
};

const findOnePublisher = async ({ name } = {}) => {
  if (!name) { throw new Error('name required.'); }

  const options = { name };
  debug('search a publisher in store with %o', options);
  const result = await store.findOnePublisher(options);
  return result;
};

init();

module.exports = {
  init,
  getStoreType,
  moduleDb,
  saveModule,
  findAllModules,
  getModuleVersions,
  getModuleLatestVersion,
  findOneModule,
  increaseModuleDownload,
  providerDb,
  saveProvider,
  findAllProviders,
  getProviderVersions,
  findProviderPackage,
  publisherDb,
  savePublisher,
  updatePublisher,
  findAllPublishers,
  findOnePublisher,
};