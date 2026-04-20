import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Updated chart config for total call duration
const chartConfig = {
  totalDuration: {
    label: "Total Call Duration", // Label shows call duration in minutes
    color: "#4ade80", // Custom color for the call duration bar
  },
};

function parseDuration(durationString) {
    const regex = /(?:(\d+)m)? ?(?:(\d+)s)?/; // Regex to match minutes and seconds
    const matches = durationString.match(regex);
  
    const minutes = parseInt(matches[1]) || 0; // Get minutes, default to 0
    const seconds = parseInt(matches[2]) || 0; // Get seconds, default to 0
  
    return minutes + seconds / 60; // Convert total duration to minutes
  }
  
  function processChartData(logs) {
    const durationByMonth = {};
  
    logs.forEach((log) => {
      const date = new Date(log.timestamp);
      const month = date.toLocaleString("default", { month: "long" });
      const year = date.getFullYear(); // Optional year separation
  
      // Check if duration exists and parse it
      if (!log.duration) {
        console.warn(`Invalid duration for log with timestamp ${log.timestamp}.`);
        return; // Skip this log if no duration
      }
  
      // Parse duration to minutes
      const duration = parseDuration(log.duration);
      
      const key = `${month} ${year}`; // Combine month and year for uniqueness
      if (!durationByMonth[key]) {
        durationByMonth[key] = 0;
      }
      durationByMonth[key] += duration; // Add parsed duration
    });
  
    const formattedChartData = Object.keys(durationByMonth).map((key) => ({
      month: key, // Month + Year label
      totalDuration: durationByMonth[key], // Total call duration in minutes
    }));
  
    return formattedChartData;
  }
  

export const BarChartCom = ({ chartData }) => {

    chartData = processChartData(chartData)
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month" // Month as the X-axis
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)} // Display first 3 letters of the month
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="totalDuration" fill="var(--color-totalDuration)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
};
