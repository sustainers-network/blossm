# Set Password Command

This command allows setting a password for an account that doesn't currently have one set.

## Usage

The command can be called via the account command gateway at:
`c.account.core.{network}/set-password`

## Requirements

- The request must be made with a valid token that contains an `account` context. No role or permission is needed: the command only ever acts on the account in the caller's own token.
- The account must not already have a password set. A password cannot be changed or reset by this command.
- The password must be between 8 and 72 bytes long.

## Payload

```json
{
  "password": "new-password-string"
}
```

## Response

### Success (202)
```json
{
  "receipt": {
    "account": {
      "root": "account-root",
      "service": "core",
      "network": "network-name"
    }
  }
}
```

### Error (400)
If the password is too short or too long (`reason: password_length`), or if the account already has a password set:
```json
{
  "error": "Account already has a password set.",
  "info": {
    "reason": "password_already_set"
  }
}
```

## Events

When successful, this command emits a `set-password` event to the account event store with the hashed password in the payload.

## Security

- The password is hashed with bcrypt before being stored, in an event store whose blocks are not public.
- The command acts only on the account in the caller's token.
- The event is numbered, so two requests at once cannot both set a password.
- Whoever holds a session for a passwordless account can set its password, and nothing here can undo that. Treat a stolen session on such an account as a stolen account.
