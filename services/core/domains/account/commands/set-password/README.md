# Set Password Command

This command allows setting a password for an account that doesn't currently have one set.

## Usage

The command can be called via the account command gateway at:
`c.account.core.{network}/set-password`

## Requirements

- The request must be made with a valid token that contains an `account` context
- The token must have the `core:account:update` permission
- The account context in the token must match the account being modified
- The account must not already have a password set
- The password must be a non-empty string

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
If the account already has a password set:
```json
{
  "error": "Account already has a password set.",
  "info": {
    "reason": "password_already_set"
  }
}
```

### Error (403)
If the user doesn't have permission or is trying to modify a different account:
```json
{
  "error": "Can only modify your own account.",
  "info": {
    "reason": "unauthorized_account_modification"
  }
}
```

## Events

When successful, this command emits a `set-password` event to the account event store with the hashed password in the payload.

## Security

- The password is hashed using the system's cryptographic hash function before being stored
- The command can only be called by the account owner (requires account context in the token)
- The command requires the `core:account:update` permission
- The command verifies that the account context matches the account being modified
- The command prevents setting a password if one already exists 