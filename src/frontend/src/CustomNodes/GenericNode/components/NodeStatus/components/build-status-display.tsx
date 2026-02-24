import ForwardedIconComponent from "@/components/common/genericIconComponent";
import {
  RUN_TIMESTAMP_PREFIX,
  STATUS_BUILD,
  STATUS_BUILDING,
  STATUS_INACTIVE,
  STATUS_MISSING_FIELDS_ERROR,
} from "@/constants/constants";
import { BuildStatus } from "@/constants/enums";
import { formatTokenCount } from "../utils/format-token-count";

const StatusMessage = ({ children, className = "text-foreground" }) => (
  <span className={`flex ${className}`}>{children}</span>
);

const TimeStamp = ({ prefix, time }) => (
  <div className="flex items-center text-secondary-foreground">
    <div>{prefix}</div>
    <div className="ml-1 text-secondary-foreground">{time}</div>
  </div>
);

const Duration = ({ duration }) => (
  <div className="flex items-center text-secondary-foreground">
    <div>Duration:</div>
    <div className="ml-auto">{duration}</div>
  </div>
);

const TokenUsageDisplay = ({
  tokenUsage,
}: {
  tokenUsage: { input: number; output: number; total: number };
}) => (
  <div className="flex flex-col gap-2 text-secondary-foreground">
    <div className="flex items-center">
      <div>Input tokens:</div>
      <div className="ml-auto flex items-center gap-1 text-sm">
        <ForwardedIconComponent
          name="Coins"
          className="h-3 w-3 text-secondary-foreground"
        />
        {formatTokenCount(tokenUsage.input)}
      </div>
    </div>
    <div className="flex items-center">
      <div>Output tokens:</div>
      <div className="ml-auto flex items-center gap-1 text-sm">
        <ForwardedIconComponent
          name="Coins"
          className="h-3 w-3 text-secondary-foreground"
        />
        {formatTokenCount(tokenUsage.output)}
      </div>
    </div>
  </div>
);

const ValidationDetails = ({
  validationString,
  lastRunTime,
  validationStatus,
}) => (
  <div className="flex max-h-100 flex-col gap-2">
    {validationString && (
      <div className="break-words text-sm text-foreground">
        {validationString}
      </div>
    )}
    {lastRunTime && (
      <TimeStamp prefix={RUN_TIMESTAMP_PREFIX} time={lastRunTime} />
    )}
    <Duration duration={validationStatus?.data.duration} />
    {validationStatus?.data?.token_usage && (
      <TokenUsageDisplay tokenUsage={validationStatus.data.token_usage} />
    )}
  </div>
);

const BuildStatusDisplay = ({
  buildStatus,
  validationStatus,
  validationString,
  lastRunTime,
}) => {
  if (buildStatus === BuildStatus.BUILDING) {
    return <StatusMessage>{STATUS_BUILDING}</StatusMessage>;
  }

  if (buildStatus === BuildStatus.INACTIVE) {
    return <StatusMessage>{STATUS_INACTIVE}</StatusMessage>;
  }

  if (buildStatus === BuildStatus.ERROR && !validationStatus) {
    // If the build status is error and there is no validation status, it means that it failed before building, so show the Missing Required Fields error message
    return <StatusMessage>{STATUS_MISSING_FIELDS_ERROR}</StatusMessage>;
  }

  if (!validationStatus) {
    return <StatusMessage>{STATUS_BUILD}</StatusMessage>;
  }

  return (
    <ValidationDetails
      validationString={validationString}
      lastRunTime={lastRunTime}
      validationStatus={validationStatus}
    />
  );
};

export default BuildStatusDisplay;
