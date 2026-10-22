import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

root = Path(__file__).parent
def read(name):
    return json.loads((root / name).read_text(encoding='utf-8'))
schemas = read('authority-documents.schema.json')
Draft202012Validator.check_schema(schemas)
count = 0
for filename in ['positive.json', 'negative.json']:
    for row in read(filename):
        valid = Draft202012Validator(schemas['$defs'][row['schema_name']], format_checker=FormatChecker()).is_valid(row['document'])
        assert valid == row.get('expected_schema_valid', True), row.get('name', row['schema_name'])
        count += 1
receipts = read('authority-receipts.schema.json')
Draft202012Validator.check_schema(receipts)
for row in read('signed-receipts.json'):
    Draft202012Validator(receipts, format_checker=FormatChecker()).validate(row)
    for field in ['kind', 'sequence', 'sha256', 'signature']:
        invalid = dict(row)
        del invalid[field]
        assert not Draft202012Validator(receipts).is_valid(invalid)
        count += 1
request = read('authority-request.schema.json')
Draft202012Validator.check_schema(request)
for branch in request['allOf'][:-1]:
    action = branch['if']['properties']['action']['const']
    assert not Draft202012Validator(request).is_valid({'action': action}), action
    count += 1
print(f'PASS: {count} document, receipt and action-specific request schema checks')
