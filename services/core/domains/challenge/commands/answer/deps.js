import { string as stringDate, moment } from "@blossm/datetime";
import { invalidArgument } from "@blossm/errors";
import { hash } from "@blossm/crypt";

export default {
    stringDate,
    moment,
    hash,
    invalidArgumentError: invalidArgument
}
