import React, { PureComponent } from 'react'
import { Form, Field as FinalFormField } from 'react-final-form'
import PropTypes from 'react-proptypes'

import Button from 'cozy-ui/react/Button'
import { translate, extend } from 'cozy-ui/react/I18n'
import Field from 'cozy-ui/react/Field'

import Manifest from '../Manifest'

const legacyOptions = options =>
  options.map(option => ({ ...option, label: option.name }))

export class AccountField extends PureComponent {
  render() {
    const { name, t, type } = this.props
    const label = t(`fields.${name}.label`)
    const fieldProps = {
      ...this.props,
      className: 'u-m-0', // 0 margin
      fullwidth: true,
      label,
      size: 'medium'
    }
    switch (type) {
      case 'dropdown':
        return (
          <Field
            {...fieldProps}
            type="dropdown"
            options={legacyOptions(fieldProps.options)}
          />
        )
      case 'password':
        return <Field {...fieldProps} />
      default:
        return <Field {...fieldProps} type="text" />
    }
  }
}

export class AccountFields extends PureComponent {
  render() {
    const { manifestFields, t } = this.props

    // Ready to use named fields array
    const namedFields = Object.keys(manifestFields).map(fieldName => ({
      ...manifestFields[fieldName],
      name: fieldName
    }))

    return (
      <div>
        {namedFields.map((field, index) => (
          <FinalFormField key={index} name={field.name}>
            {({ input }) => (
              <AccountField label={field.name} {...field} {...input} t={t} />
            )}
          </FinalFormField>
        ))}
      </div>
    )
  }
}

export class AccountForm extends PureComponent {
  constructor(props, context) {
    super(props, context)
    const { lang, locales } = props
    if (locales && lang) {
      extend(locales[lang])
    }
  }

  render() {
    const { account, fields, t } = this.props
    const sanitizedFields = Manifest.sanitizeFields(fields)
    const initialValues = account ? account.auth : {}
    return (
      <Form
        initialValues={initialValues}
        // eslint-disable-next-line no-console
        onSubmit={v => console.log(v)}
        render={({ values }) => (
          <div>
            <AccountFields manifestFields={sanitizedFields} t={t} />
            <Button
              className="u-mt-2 u-mb-1-half"
              extension="full"
              label={t('accountForm.submit.label')}
              onclick={() => alert(JSON.stringify(values, 0, 2))}
            />
          </div>
        )}
      />
    )
  }
}

AccountForm.propTypes = {
  account: PropTypes.object,
  fields: PropTypes.object.isRequired,
  locales: PropTypes.object
}

export default translate()(AccountForm)
