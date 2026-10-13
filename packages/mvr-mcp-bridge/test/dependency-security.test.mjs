import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const proxyAddress = require("proxy-addr");
const { Address4, Address6 } = require("ip-address");
const uri = require("fast-uri");

test("proxy trust does not widen a short IPv4-mapped IPv6 prefix to all IPv4", () => {
  assert.equal(proxyAddress.compile("::ffff:10.0.0.0/8")("203.0.113.1"), false);
  const trust = proxyAddress.compile("::ffff:10.0.0.0/104");
  assert.equal(trust("10.0.0.1"), true);
  assert.equal(trust("203.0.113.1"), false);
});

test("subnet checks reject cross-family bit coincidences", () => {
  for (const method of ["isInSubnet", "isHostInSubnet"]) {
    assert.equal(new Address6("a00::1")[method](new Address4("10.0.0.0/8")), false);
    assert.equal(new Address4("32.1.13.184")[method](new Address6("2001:db8::/32")), false);
    assert.equal(new Address4("10.0.0.1")[method](new Address4("10.0.0.0/8")), true);
    assert.equal(new Address6("2001:db8::1")[method](new Address6("2001:db8::/32")), true);
  }
});

test("invalid oversized IPv6 input does not build an amplified diagnostic", () => {
  const input = "!".repeat(4096);
  assert.equal(Address6.isValid(input), false);
  assert.throws(() => new Address6(input), (error) => {
    assert.equal(error.name, "AddressError");
    assert.equal(typeof error.parseMessage, "undefined");
    return true;
  });
});

test("scheme-relative percent-encoded hosts normalize their decoded case", () => {
  assert.equal(uri.parse("//%41.com").host, "a.com");
  assert.equal(uri.parse("//A.com").host, "a.com");
  assert.equal(uri.equal("//%41.com", "//a.com"), true);
  assert.equal(uri.equal("//%41.com", "//b.com"), false);
});
