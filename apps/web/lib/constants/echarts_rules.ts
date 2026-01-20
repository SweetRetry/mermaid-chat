export const ECHARTS_RULES = `## ECharts Rules

ECharts is used for statistical/data charts. Mermaid is used for diagrams showing process/structure.

### When to Use ECharts (NOT Mermaid)
- Funnel charts, pie/donut charts, radar charts, gauge charts
- Scatter plots, heat maps, treemaps, sunburst charts
- Bar charts, line charts with complex data
- Any chart focused on **numerical data visualization**

### When to Use Mermaid (NOT ECharts)
- Flowcharts, sequence diagrams, class diagrams, state diagrams
- ER diagrams, Gantt charts, mind maps, git graphs
- Any diagram focused on **process flow or structural relationships**

### Funnel Chart with Annotations
When showing funnel stages with additional info (tracking points, metrics, etc.):

**FORBIDDEN approaches (will cause errors or layout issues):**
- \`graphic\` component - fixed pixel positions break on resize
- \`graph\` series with fixed x/y coordinates - same problem
- Any approach using absolute pixel values

**RECOMMENDED: Use label with labelLine for annotations**
Put annotation text directly in each data item's name, use right-side labels:
\`\`\`json
{
  "series": [{
    "type": "funnel",
    "left": "5%",
    "width": "45%",
    "label": {
      "show": true,
      "position": "right",
      "formatter": "{b}",
      "padding": [8, 12],
      "backgroundColor": "#fff",
      "borderColor": "#ddd",
      "borderWidth": 1,
      "borderRadius": 4
    },
    "labelLine": {
      "show": true,
      "length": 30,
      "lineStyle": { "type": "dashed", "color": "#999" }
    },
    "data": [
      { "value": 100, "name": "Stage 1\\n- Point A\\n- Point B" },
      { "value": 80, "name": "Stage 2\\n- Point C" }
    ]
  }]
}
\`\`\`

**For separate inside label + right annotation, use two labels per item:**
\`\`\`json
{
  "data": [
    {
      "value": 100,
      "name": "Stage Name",
      "label": { "show": true, "position": "inside", "formatter": "{b}" },
      "labelLine": { "show": true },
      "emphasis": {
        "label": { "show": true, "position": "right", "formatter": "Annotation text" }
      }
    }
  ]
}
\`\`\`

### Output Format - STRICT JSON RULES

Output ONLY valid JSON for echarts.setOption(). The JSON must be parseable by \`JSON.parse()\`.

**FORBIDDEN (will cause parse errors):**
- \`function(params) {...}\` or \`() => {...}\` - JSON does not support functions
- \`// comments\` or \`/* comments */\` - JSON does not support comments
- Trailing commas: \`[1, 2, 3,]\` or \`{"a": 1,}\`
- Single quotes: \`'text'\` - must use double quotes \`"text"\`
- Unquoted keys: \`{key: "value"}\` - must be \`{"key": "value"}\`
- \`undefined\`, \`NaN\`, \`Infinity\` - not valid JSON values
- Template literals: \`\\\`text\\\`\` - use regular strings
- Hexadecimal: \`0xff\` - use decimal \`255\`
- Regular expressions: \`/pattern/\`
- \`new Date()\`, \`new RegExp()\` or any constructor

**ALLOWED in JSON:**
- Strings (double-quoted): \`"text"\`
- Numbers: \`123\`, \`-45.67\`
- Booleans: \`true\`, \`false\`
- Null: \`null\`
- Arrays: \`[1, 2, 3]\`
- Objects: \`{"key": "value"}\`

**For formatters, use string templates:**
- \`"formatter": "{b}\\n{c}"\` - template variables
- \`{a}\` = series name, \`{b}\` = data name, \`{c}\` = value, \`{d}\` = percentage
- For custom text per item, put it in the data's \`name\` field

**Do NOT wrap output:**
- No markdown fences (\`\`\`json ... \`\`\`)
- No explanatory text before/after
- Output the raw JSON object directly
`
