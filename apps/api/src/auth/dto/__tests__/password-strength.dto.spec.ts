import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { RegisterDto } from '../register.dto'
import { ResetPasswordDto } from '../reset-password.dto'

describe('RegisterDto password strength validation', () => {
  function buildRegisterDto(password: string) {
    return plainToInstance(RegisterDto, { email: 'test@example.com', password })
  }

  it('accepts a password with lowercase, uppercase, and digit', async () => {
    const errors = await validate(buildRegisterDto('ValidPass1'))
    const passwordErrors = errors.filter((error) => error.property === 'password')
    expect(passwordErrors).toHaveLength(0)
  })

  it('rejects a password with no uppercase letter', async () => {
    const errors = await validate(buildRegisterDto('nouppercase1'))
    const passwordErrors = errors.filter((error) => error.property === 'password')
    expect(passwordErrors.length).toBeGreaterThan(0)
  })

  it('rejects a password with no lowercase letter', async () => {
    const errors = await validate(buildRegisterDto('NOLOWERCASE1'))
    const passwordErrors = errors.filter((error) => error.property === 'password')
    expect(passwordErrors.length).toBeGreaterThan(0)
  })

  it('rejects a password with no digit', async () => {
    const errors = await validate(buildRegisterDto('NoDigitHere'))
    const passwordErrors = errors.filter((error) => error.property === 'password')
    expect(passwordErrors.length).toBeGreaterThan(0)
  })

  it('rejects a password shorter than 8 characters', async () => {
    const errors = await validate(buildRegisterDto('Ab1'))
    const passwordErrors = errors.filter((error) => error.property === 'password')
    expect(passwordErrors.length).toBeGreaterThan(0)
  })

  it('accepts a long password with all character classes', async () => {
    const errors = await validate(buildRegisterDto('SuperSecure123!Password'))
    const passwordErrors = errors.filter((error) => error.property === 'password')
    expect(passwordErrors).toHaveLength(0)
  })
})

describe('ResetPasswordDto password strength validation', () => {
  function buildResetPasswordDto(newPassword: string) {
    return plainToInstance(ResetPasswordDto, { token: 'some-token', newPassword })
  }

  it('accepts a password with lowercase, uppercase, and digit', async () => {
    const errors = await validate(buildResetPasswordDto('ValidPass1'))
    const passwordErrors = errors.filter((error) => error.property === 'newPassword')
    expect(passwordErrors).toHaveLength(0)
  })

  it('rejects a password with no uppercase letter', async () => {
    const errors = await validate(buildResetPasswordDto('nouppercase1'))
    const passwordErrors = errors.filter((error) => error.property === 'newPassword')
    expect(passwordErrors.length).toBeGreaterThan(0)
  })

  it('rejects a password with no digit', async () => {
    const errors = await validate(buildResetPasswordDto('NoDigitHere'))
    const passwordErrors = errors.filter((error) => error.property === 'newPassword')
    expect(passwordErrors.length).toBeGreaterThan(0)
  })
})
