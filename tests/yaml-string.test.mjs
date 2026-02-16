import test from 'node:test';
import assert from 'node:assert/strict';
import { yamlString } from '../config/www/nx-displaygrid/util/yaml.util.js';

test('yamlString wraps plain strings in single quotes', () => {
    assert.equal(yamlString('nx-displaygrid'), "'nx-displaygrid'");
});

test('yamlString escapes internal single quotes', () => {
    assert.equal(yamlString("Kid's List"), "'Kid''s List'");
});

test('yamlString preserves YAML-sensitive punctuation safely', () => {
    assert.equal(yamlString('alpha: beta # note'), "'alpha: beta # note'");
});

test('yamlString supports nullish values', () => {
    assert.equal(yamlString(null), "''");
    assert.equal(yamlString(undefined), "''");
});
