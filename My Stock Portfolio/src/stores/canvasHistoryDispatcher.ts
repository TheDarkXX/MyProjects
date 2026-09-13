import { CanvasCommand } from './canvasHistoryStore';
import { useDrawingStore } from './drawingStore';
import { useIndicatorStore } from './useIndicatorStore';

export function executeUndo(cmd: CanvasCommand): void {
  switch (cmd.type) {
    case 'ADD_LINE':
      if (cmd.forwardData?.lineId) {
        useDrawingStore.getState().restoreDeleteLine(cmd.symbol, cmd.forwardData.lineId);
      }
      break;

    case 'DELETE_LINE':
      if (cmd.inverseData?.deletedLine) {
        useDrawingStore.getState().restoreAddLine(cmd.symbol, cmd.inverseData.deletedLine);
      }
      break;

    case 'UPDATE_LINE':
      if (cmd.inverseData?.lineId && cmd.inverseData?.previousState) {
        useDrawingStore.getState().restoreUpdateLine(cmd.symbol, cmd.inverseData.lineId, cmd.inverseData.previousState);
      }
      break;

    case 'ADD_TRENDLINE':
      if (cmd.forwardData?.trendLineId) {
        useDrawingStore.getState().restoreDeleteTrendLine(cmd.symbol, cmd.forwardData.trendLineId);
      }
      break;

    case 'DELETE_TRENDLINE':
      if (cmd.inverseData?.deletedTrendLine) {
        useDrawingStore.getState().restoreAddTrendLine(cmd.symbol, cmd.inverseData.deletedTrendLine);
      }
      break;

    case 'UPDATE_TRENDLINE':
      if (cmd.inverseData?.trendLineId && cmd.inverseData?.previousState) {
        useDrawingStore.getState().restoreUpdateTrendLine(cmd.symbol, cmd.inverseData.trendLineId, cmd.inverseData.previousState);
      }
      break;

    case 'CLEAR_ALL_DRAWINGS':
      useDrawingStore.getState().restoreFullDrawings(
        cmd.symbol,
        cmd.inverseData?.horizontalLines || [],
        cmd.inverseData?.trendLines || []
      );
      break;

    case 'AUTO_DETECT_SR':
      useDrawingStore.getState().restoreFullDrawings(
        cmd.symbol,
        cmd.inverseData?.previousHorizontalLines || [],
        cmd.inverseData?.previousTrendLines || []
      );
      break;

    case 'TOGGLE_INDICATOR':
      if (cmd.inverseData?.configDelta) {
        useIndicatorStore.getState().restoreIndicatorPartial(cmd.inverseData.configDelta);
      }
      break;
  }
}

export function executeRedo(cmd: CanvasCommand): void {
  switch (cmd.type) {
    case 'ADD_LINE':
      if (cmd.forwardData?.line) {
        useDrawingStore.getState().restoreAddLine(cmd.symbol, cmd.forwardData.line);
      }
      break;

    case 'DELETE_LINE':
      if (cmd.inverseData?.deletedLine?.id) {
        useDrawingStore.getState().restoreDeleteLine(cmd.symbol, cmd.inverseData.deletedLine.id);
      }
      break;

    case 'UPDATE_LINE':
      if (cmd.forwardData?.lineId && cmd.forwardData?.newState) {
        useDrawingStore.getState().restoreUpdateLine(cmd.symbol, cmd.forwardData.lineId, cmd.forwardData.newState);
      }
      break;

    case 'ADD_TRENDLINE':
      if (cmd.forwardData?.trendLine) {
        useDrawingStore.getState().restoreAddTrendLine(cmd.symbol, cmd.forwardData.trendLine);
      }
      break;

    case 'DELETE_TRENDLINE':
      if (cmd.inverseData?.deletedTrendLine?.id) {
        useDrawingStore.getState().restoreDeleteTrendLine(cmd.symbol, cmd.inverseData.deletedTrendLine.id);
      }
      break;

    case 'UPDATE_TRENDLINE':
      if (cmd.forwardData?.trendLineId && cmd.forwardData?.newState) {
        useDrawingStore.getState().restoreUpdateTrendLine(cmd.symbol, cmd.forwardData.trendLineId, cmd.forwardData.newState);
      }
      break;

    case 'CLEAR_ALL_DRAWINGS':
      useDrawingStore.getState().restoreFullDrawings(cmd.symbol, [], []);
      break;

    case 'AUTO_DETECT_SR':
      useDrawingStore.getState().restoreFullDrawings(
        cmd.symbol,
        cmd.forwardData?.newHorizontalLines || [],
        cmd.forwardData?.newTrendLines || []
      );
      break;

    case 'TOGGLE_INDICATOR':
      if (cmd.forwardData?.configDelta) {
        useIndicatorStore.getState().restoreIndicatorPartial(cmd.forwardData.configDelta);
      }
      break;
  }
}
