import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'

import Button from 'cozy-ui/transpiled/react/Button'
import Card from 'cozy-ui/transpiled/react/Card'
import { translate } from 'cozy-ui/transpiled/react/I18n'
import Icon from 'cozy-ui/transpiled/react/Icon'
import { Uppercase, Text } from 'cozy-ui/transpiled/react/Text'

import * as triggers from '../../helpers/triggers'
import TriggerLauncher from '../TriggerLauncher'

export class LaunchTriggerCard extends PureComponent {
  render() {
    const { className, f, trigger, t, ...rest } = this.props
    return (
      <Card className={className} {...rest}>
        <TriggerLauncher trigger={trigger}>
          {({ error, launch, running, trigger }) => {
            const lastSuccessDate = triggers.getLastSuccessDate(trigger)
            return (
              <div>
                <ul className="u-nolist u-pl-0">
                  <li>
                    <Uppercase
                      tag="span"
                      className="u-coolGrey u-mr-half u-fz-tiny"
                    >
                      {t('card.launchTrigger.lastSync.label')}
                    </Uppercase>
                    <Text className="u-fz-tiny" tag="span">
                      {running
                        ? t('card.launchTrigger.lastSync.syncing')
                        : lastSuccessDate
                        ? f(
                            lastSuccessDate,
                            t('card.launchTrigger.lastSync.format')
                          )
                        : t('card.launchTrigger.lastSync.unknown')}
                    </Text>
                  </li>
                  <li>
                    <Uppercase
                      className="u-coolGrey u-mr-half u-fz-tiny"
                      tag="span"
                    >
                      {t('card.launchTrigger.frequency.label')}
                    </Uppercase>
                    <Text className="u-fz-tiny" tag="span">
                      {t(
                        `card.launchTrigger.frequency.${triggers.getFrequency(
                          trigger
                        ) || 'undefined'}`
                      )}
                    </Text>
                  </li>
                </ul>
                <div>
                  {error && (
                    <Text className="u-error">
                      {t('card.launchTrigger.error')}
                    </Text>
                  )}
                  <Button
                    label={t('card.launchTrigger.button.label')}
                    icon={<Icon focusable="false" icon="sync" spin={running} />}
                    className="u-mv-half u-mh-0"
                    disabled={running}
                    onClick={launch}
                    subtle
                  />
                </div>
              </div>
            )
          }}
        </TriggerLauncher>
      </Card>
    )
  }
}

LaunchTriggerCard.propTypes = {
  ...Card.propTypes,
  trigger: PropTypes.object.isRequired,
  f: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

export default translate()(LaunchTriggerCard)
