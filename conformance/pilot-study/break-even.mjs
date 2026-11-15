import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export function breakEven(v){
  const nonnegative=['annual_volume','loaded_hourly_cost','integration_hours','annual_support_cost','integration_life_years'];
  const deltas=['minutes_saved_per_packet','avoidable_loss_saved_per_packet','incremental_tool_cost_per_packet'];
  for(const k of [...nonnegative,...deltas])if(!Number.isFinite(v[k])||(nonnegative.includes(k)&&v[k]<0))throw Error('Invalid '+k);
  if(v.integration_life_years<=0||!v.annual_volume||!v.currency?.match(/^[A-Z]{3}$/))throw Error('Supply positive annual volume, integration lifetime and a currency code.');
  const labor=(v.minutes_saved_per_packet/60)*v.loaded_hourly_cost;
  const annual_integration=v.integration_hours*v.loaded_hourly_cost/v.integration_life_years;
  const net_per_packet=labor+v.avoidable_loss_saved_per_packet-v.incremental_tool_cost_per_packet;
  const annual_break_even_fee=v.annual_volume*net_per_packet-annual_integration-v.annual_support_cost;
  return {currency:v.currency,annual_integration,net_per_packet,annual_break_even_fee,break_even_fee_per_packet:annual_break_even_fee/v.annual_volume};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(breakEven(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
