import { randomDayTime } from './daytime'

const DAILY = 'daily'
const HOURLY = 'hourly'
const MONTHLY = 'monthly'
const WEEKLY = 'weekly'
const VALID_FREQUENCIES = [DAILY, HOURLY, MONTHLY, WEEKLY]

const DEFAULT_FREQUENCY = WEEKLY
const DEFAULT_CRON = '0 0 0 * * 0' // Once a week, sunday at midnight
// By default konnectors are run at random hour between 00:00PM and 05:00AM.
const DEFAULT_TIME_INTERVAL = [0, 5]

/**
 * Stategies for building cron values
 * See https://docs.cozy.io/en/cozy-stack/jobs/#cron-syntax
 */
const getCronStrategies = options => {
  const { dayOfMonth, dayOfWeek, hours, minutes } = options
  return {
    [DAILY]: `0 ${minutes} ${hours} * * *`,
    [HOURLY]: `0 ${minutes} * * * *`,
    [MONTHLY]: `0 ${minutes} ${hours} ${dayOfMonth} * *`,
    [WEEKLY]: `0 ${minutes} ${hours} * * ${dayOfWeek}`
  }
}

/**
 * Build a cron string for given konnector with given options
 * See https://docs.cozy.io/en/cozy-stack/jobs/#cron-syntax
 * @param  {string} frequency Frequency from `hourly`, `daily`, `weekly` or
 * `monthly`.
 * @param  {object} options   Object which may contain `hours`, `minutes` and
 * `startDate`.
 * @return {string}           The cron definition for trigger
 */
export const buildCron = (frequency, options = {}) => {
  const sanitizedFrequency = VALID_FREQUENCIES.includes(frequency)
    ? frequency
    : DEFAULT_FREQUENCY

  const sanitizedOptions = {
    dayOfMonth: 1,
    dayOfWeek: 1,
    hours: 0,
    minutes: 0,
    ...options
  }

  return getCronStrategies(sanitizedOptions)[sanitizedFrequency]
}

export const buildKonnectorCron = (
  konnector,
  startDate = new Date(),
  randomDayTimeFn = randomDayTime
) =>
  buildCron(konnector.frequency, {
    ...randomDayTimeFn.apply(
      null,
      konnector.time_interval || DEFAULT_TIME_INTERVAL
    ),
    dayOfWeek: startDate.getDay(),
    dayOfMonth: startDate.getDate()
  })

/**
 * Build trigger attributes given konnector and account
 * @param  {object} konnector
 * @param  {object} account
 * @return {object} created trigger
 */
export const buildKonnectorTriggerAttributes = ({
  konnector,
  account,
  cron = DEFAULT_CRON
}) => ({
  type: '@cron',
  arguments: cron,
  worker: 'konnector',
  worker_arguments: {
    konnector: konnector.slug,
    account: account._id
  }
})
