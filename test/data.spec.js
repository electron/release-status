const fs = require('fs');
const path = require('path');

const nock = require('nock');

const { getVersionsOrUpdate } = require('../src/data');

function loadFixture(filePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', filePath), 'utf-8'));
}

const chromiumM122Fixture = loadFixture('chromium-m122.json');
const chromiumM124Fixture = loadFixture('chromium-m124.json');
const chromiumM126Fixture = loadFixture('chromium-m126.json');
const chromiumM128Fixture = loadFixture('chromium-m128.json');
const chromiumM130Fixture = loadFixture('chromium-m130.json');
const indexJsonFixture = loadFixture('index.json');

nock('https://electronjs.org').get('/headers/index.json').reply(200, indexJsonFixture);

nock('https://chromiumdash.appspot.com')
  .get('/fetch_milestone_schedule')
  .query({ mstone: '122' })
  .reply(200, chromiumM122Fixture)
  .get('/fetch_milestone_schedule')
  .query({ mstone: '124' })
  .reply(200, chromiumM124Fixture)
  .get('/fetch_milestone_schedule')
  .query({ mstone: '126' })
  .reply(200, chromiumM126Fixture)
  .get('/fetch_milestone_schedule')
  .query({ mstone: '128' })
  .reply(200, chromiumM128Fixture)
  .get('/fetch_milestone_schedule')
  .query({ mstone: '130' })
  .reply(200, chromiumM130Fixture);

describe('getVersionsOrUpdate', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  describe('majors', () => {
    const isStable = ({ isStable }) => isStable === true;
    const isSupported = ({ isSupported }) => isSupported === true;
    const isNotSupported = ({ isSupported }) => isSupported === false;

    it('calculated dates match snapshot', async () => {
      const { majors } = await getVersionsOrUpdate();
      expect(
        majors.map(({ major, alpha, beta, stable, endOfLife }) => ({
          major,
          alpha,
          beta,
          stable,
          endOfLife,
        })),
      ).toMatchSnapshot();
    });

    it('has all majors from E3 onward', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(majors.map(({ major }) => major)).toEqual([...Array(31).keys()].slice(2).reverse());
    });

    it('has alphas only from E15 onward', async () => {
      const { majors } = await getVersionsOrUpdate();
      const alphaIsNull = ({ alpha }) => alpha === null;

      expect(majors.filter(({ major }) => major < 15).every(alphaIsNull)).toEqual(true);
      expect(majors.filter(({ major }) => major >= 15).some(alphaIsNull)).toEqual(false);
    });

    it('all majors before E29 are stable', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(majors.filter(({ major }) => major < 29).every(isStable)).toEqual(true);
    });

    it('all majors from E29 onward are not stable', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(majors.filter(({ major }) => major >= 29).some(isStable)).toEqual(false);
    });

    it('all majors before E26 are not supported', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(majors.filter(({ major }) => major < 26).some(isSupported)).toEqual(false);
    });

    it('all majors from E26 onward are supported', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(majors.filter(({ major }) => major >= 26).every(isSupported)).toEqual(true);
    });

    it('all stable majors from E15 onward have an actual date for alpha', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(
        majors
          .filter(({ major }) => major >= 15)
          .filter(isStable)
          .every(({ alpha }) => {
            return typeof alpha.actual === 'string';
          }),
      ).toEqual(true);
    });

    it('all stable majors have actual dates for beta/stable', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(
        majors.filter(isStable).every(({ beta, stable }) => {
          return typeof beta.actual === 'string' && typeof stable.actual === 'string';
        }),
      ).toEqual(true);
    });

    it('all stable majors from E15 onward have even Chromium milestones', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(
        majors
          .filter(({ major }) => major >= 15)
          .filter(isStable)
          .every(({ chromium }) => chromium % 2 === 0),
      ).toEqual(true);
    });

    it('all unsupported majors have actual dates for endOfLife', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(
        majors.filter(isNotSupported).every(({ endOfLife }) => {
          return typeof endOfLife.actual === 'string';
        }),
      ).toEqual(true);
    });

    it('all supported majors have estimated dates for endOfLife', async () => {
      const { majors } = await getVersionsOrUpdate();

      expect(
        majors.filter(isSupported).every(({ endOfLife }) => {
          return typeof endOfLife.estimated === 'string';
        }),
      ).toEqual(true);
    });

    it.todo('falls back to stored data on Chromium Dash error');
  });
});
