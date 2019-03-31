import * as React from "react";
import { render } from "react-dom";
import * as R from "ramda";
import Tooltip from "./Tooltip";
import useDataApi from "./useDataApi";

import "./styles.scss";

const stats = data =>
  data.reduce(
    ({ count, sum, mean, vari }, x) => {
      const k = 1 / (count + 1);
      const mean_ = mean + k * (x - mean);
      const ssr_ = (count - 1) * vari + k * count * (x - mean) * (x - mean);
      return {
        count: count + 1,
        sum: sum + x,
        mean: mean_,
        vari: ssr_ / Math.max(1, count)
      };
    },
    { count: 0, sum: 0, mean: 0, vari: 0 }
  );

function filterOutliers(someArray) {
  // Copy the values, rather than operating on references to existing values
  var values = someArray.concat();

  // Then sort
  values.sort(function(a, b) {
    return a - b;
  });

  /* Then find a generous IQR. This is generous because if (values.length / 4)
   * is not an int, then really you should average the two elements on either
   * side to find q1.
   */

  var q1 = values[Math.floor(values.length / 4)];
  // Likewise for q3.
  var q3 = values[Math.ceil(values.length * (3 / 4))];
  var iqr = q3 - q1;

  // Then find min and max values
  var maxValue = q3 + iqr * 1.5;
  var minValue = q1 - iqr * 1.5;

  // Then filter anything beyond or beneath these values.
  var filteredValues = values.filter(function(x) {
    return x <= maxValue && x >= minValue;
  });

  // Then return
  return filteredValues;
}

function formatDate(d) {
  if (!d) {
    return "";
  } else {
    try {
      return new Date(d)
        .toJSON()
        .split(".")[0]
        .split("T")
        .join(" ");
    } catch (ex) {
      console.warn(ex);
      return "";
    }
  }
}

function Input({ defaultValue, onChange }) {
  const [value, set_value] = React.useState(defaultValue);
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onChange(value);
      }}
    >
      <input
        value={!value ? "" : value}
        onChange={ev => set_value(ev.target.value)}
      />
      <button type="submit">GO</button>
    </form>
  );
}

function App() {
  const [xcid, set_xcid] = React.useState("T0JIYg");

  const engagementSummaryData = useDataApi(
    !xcid
      ? null
      : `https://sigma.sam-media.com/pipend/apis/projects/575422b0156bf736d3b6fb59/documents/rmkyo9w/versions/1/execute/900/query?xcid=${xcid}`,
    {},
    x => x[0]
  );

  const eventsData = useDataApi(
    !xcid
      ? null
      : `https://sigma.sam-media.com/pipend/apis/projects/575422b0156bf736d3b6fb59/documents/rhLHRqO/versions/5/execute/900/query?xcid=${xcid}`,
    {
      users: []
    },
    data =>
      R.merge(
        {
          users: R.pipe(
            R.map((x: any) =>
              R.merge(x, { events: R.sortBy(e => e.relt)(x.events) })
            )
          )(data)
        },
        R.pipe(
          R.map((x: any) =>
            R.merge(x, { events: R.sortBy(e => e.relt)(x.events) })
          ),
          R.chain(x => x.events),
          R.pipe(
            R.map((x: any) => x.relt),
            R.filter((x: any) => typeof x == "number"),
            filterOutliers,
            (xs: any) =>
              R.merge(stats(xs), {
                max: R.reduce(R.max, -Infinity, xs),
                median: R.median(xs),
                min: R.reduce(R.min, Infinity, xs)
              })
          )
        )(data)
      )
  );

  return (
    <div className="App">
      <Input defaultValue={xcid} onChange={set_xcid} />
      {engagementSummaryData.isLoading ? (
        ""
      ) : engagementSummaryData.isError ? (
        "ERROR"
      ) : (
        <ViewEngagementSummaryData {...engagementSummaryData.data} />
      )}
      {eventsData.isLoading ? (
        "Loading ..."
      ) : eventsData.isError ? (
        "ERROR"
      ) : (
        <ViewEventsData data={eventsData.data} />
      )}
    </div>
  );
}

function ViewEngagementSummaryData({
  from_date,
  to_date,
  with_engagement,
  total
}) {
  return (
    <div className="engagement_summary">
      <div>
        <span>Total Views: </span>
        <span>{total}</span>
      </div>
      <div>
        <span>Engagement Rate: </span>
        <span>{Math.round((100 * with_engagement) / total)}%</span>
      </div>
      <div>
        <span>{formatDate(from_date)} </span>
        <span>{formatDate(to_date)}</span>
      </div>
    </div>
  );
}

function ViewEventsData({ data }) {
  return (
    <>
      {data.users.map((d, i) => {
        const msisdn = d.events.find(d => !!d.args && !!d.args.msisdn);
        return (
          <div key={i.toString()}>
            <div className="events-timeline">
              <span className="date">{d.date_created.split(".")[0]}</span>
              <span className="ip">{d.ip}</span>
              <span className="msisdn">
                {R.view(R.lensPath(["args", "msisdn"]), msisdn)}
              </span>
              {R.range(0, Math.ceil(data.max / (1000 * 5))).map(i => {
                const from = (i - 1) * 1000 * 5;
                const to = i * 1000 * 5;
                const events = d.events.filter(
                  e => e.relt >= from && e.relt <= to
                );
                return (
                  <Tooltip
                    placement="top"
                    tooltip={<pre>{JSON.stringify(events, null, 2)}</pre>}
                    className={`event ${events
                      .map(x => x.category)
                      .join(" ")} ${events
                      .map(x => x.action)
                      .join(" ")} ${events.map(x => x.label).join(" ")}`}
                    key={i.toString()}
                  >
                    {events.length > 0 ? events.length : ""}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

const rootElement = document.getElementById("root");
render(<App />, rootElement);
