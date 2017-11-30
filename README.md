[![Build Status](https://travis-ci.org/peteboere/csstoxpath.svg?branch=master)](https://travis-ci.org/peteboere/csstoxpath)

## CSS to XPath

Converts most CSS 2.1/3 selectors (see exclusions below) to equivalent XPath.

See `test.js` for examples.


### Custom pseudo classes

All `:text*` text matching pseudo classes normalize whitespace and ignore tags.
E.g. `"  my   <i>string</i> "` is treated as `"my string"`.

* `:text("foo")` Case-insensitive matching of element text content
* `:text-case("foo")` As `:text` but case-sensitive
* `:text-contains("foo")` Case-insensitive substring matching of element text content
* `:text-contains-case("foo")` As `:text-contains` but case-sensitive
* `:childless` As `:empty` but ignoring whitespace


### Unsupported selectors

These may be supported at a later date:

* `nth-last-child`
* `:lang()`

As far as I'm aware the following cannot be implemented in XPath:

* `*-of-type`

The following are excluded as they can only be partially supported (XPath only matches static attributes):

* `:checked`
* `:disabled`
* `:enabled`
* `:required`
