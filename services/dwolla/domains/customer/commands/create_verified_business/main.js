const deps = require("./deps");

let dwolla;

dwolla.create.webhook({
  url: `https://c.${process.env.DOMAIN}.${process.env.SERVICE}.${process.env.HOST}/${process.env.NAME}`,
});

module.exports = async ({
  payload,
  ip,
  queryAggregatesFn,
  logEventsFn,
  generateRootFn,
}) => {
  // Make sure this principal isn't already associated with a dwolla customer.
  // Do this by looking for a dwolla
  const [aggregate] = await queryAggregatesFn({
    query: {
      "group.root": payload.group.root,
    },
  });

  if (!aggregate || !aggregate.exists) throw "nope";

  const root = generateRootFn();

  if (!dwolla)
    dwolla = deps.dwolla("some-key", "some-secret", { environment: "prod" });

  await logEventsFn([
    {
      action: "queue-create-verified-business",
      correctNumber: 0,
      root,
      payload: {
        group: payload.group,
        exists: false,
      },
    },
  ]);

  const location = await dwolla.customer.createVerifiedBusiness({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    ipAddress: ip,
    dateOfBirth: payload.dateOfBirth,
    ssn: payload.ssn,
    address1: payload.address1,
    address2: payload.address2,
    city: payload.city,
    state: payload.state,
    postalCode: payload.postalCode,
    businessName: payload.businessName,
    businessType: payload.businessType,
    businessClassification: payload.businessClassification,
    ein: payload.ein,
    website: payload.website,
    phone: payload.phone,
    ...(payload.controller && {
      controller: {
        firstName: payload.controller.firstName,
        lastName: payload.controller.lastName,
        title: payload.controller.title,
        dateOfBirth: payload.controller.dateOfBirth,
        ssn: payload.controller.ssn,
        ...(payload.controller.passport && {
          passport: {
            number: payload.controller.passport.number,
            country: payload.controller.passport.country,
          },
        }),
        address: {
          address1: payload.controller.address.address1,
          address2: payload.controller.address.address2,
          city: payload.controller.address.city,
          stateProvinceRegion: payload.controller.address.stateProvinceRegion,
          postalCode: payload.controller.address.postalCode,
          country: payload.controller.address.country,
        },
      },
    }),
    correlationId: root,
  });

  return {
    events: [
      {
        action: "request-create-verified-business",
        root,
        payload: {
          location,
        },
      },
    ],
  };
};
