"use client";

import { useReducer, useCallback } from "react";
import type {
  SimulatorAction,
  SimulatorDestination,
  SimulatorState,
  SimulatorToken,
  WizardPhaseId,
} from "../types/simulator.types";
import { shouldOfferOptionalStack } from "../utils/wizardPhases";

const initialState: SimulatorState = {
  phase: "select_token",
  token: null,
  destination: null,
  stackVenue: null,
  amount: "",
};

function reducer(
  state: SimulatorState,
  action: SimulatorAction
): SimulatorState {
  switch (action.type) {
    case "selectToken": {
      const isSameToken = state.token?.code === action.token.code;
      return {
        ...state,
        token: action.token,
        destination: isSameToken ? state.destination : null,
        stackVenue: isSameToken ? state.stackVenue : null,
        amount: isSameToken ? state.amount : "",
      };
    }
    case "selectDestination": {
      const isSameId = state.destination?.id === action.destination.id;
      const isYield = action.destination.kind === "yield-token";
      return {
        ...state,
        destination: action.destination,
        stackVenue: !isYield || !isSameId ? null : state.stackVenue,
        amount: isSameId ? state.amount : "",
      };
    }
    case "selectStackVenue":
      return { ...state, stackVenue: action.venue };
    case "setAmount":
      return { ...state, amount: action.amount };
    case "goNext": {
      if (state.phase === "select_token") {
        if (!state.token) return state;
        return { ...state, phase: "select_destination" };
      }
      if (state.phase === "select_destination") {
        if (!state.destination) return state;
        if (shouldOfferOptionalStack(state.token, state.destination)) {
          return { ...state, phase: "optional_stack", stackVenue: null };
        }
        return { ...state, phase: "simulate" };
      }
      if (state.phase === "optional_stack") {
        return { ...state, phase: "simulate" };
      }
      return state;
    }
    case "goBack": {
      if (state.phase === "simulate") {
        if (shouldOfferOptionalStack(state.token, state.destination)) {
          return { ...state, phase: "optional_stack" };
        }
        return { ...state, phase: "select_destination" };
      }
      if (state.phase === "optional_stack") {
        return { ...state, phase: "select_destination" };
      }
      if (state.phase === "select_destination") {
        return { ...state, phase: "select_token" };
      }
      return state;
    }
    case "goToPhase":
      return { ...state, phase: action.phase };
    case "reset":
      return initialState;
    default:
      return state;
  }
}

export function useSimulatorState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const selectToken = useCallback(
    (token: SimulatorToken) => dispatch({ type: "selectToken", token }),
    []
  );
  const selectDestination = useCallback(
    (destination: SimulatorDestination) =>
      dispatch({ type: "selectDestination", destination }),
    []
  );
  const selectStackVenue = useCallback(
    (venue: SimulatorDestination | null) =>
      dispatch({ type: "selectStackVenue", venue }),
    []
  );
  const setAmount = useCallback(
    (amount: string) => dispatch({ type: "setAmount", amount }),
    []
  );
  const goNext = useCallback(() => dispatch({ type: "goNext" }), []);
  const goBack = useCallback(() => dispatch({ type: "goBack" }), []);
  const goToPhase = useCallback(
    (phase: WizardPhaseId) => dispatch({ type: "goToPhase", phase }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return {
    state,
    selectToken,
    selectDestination,
    selectStackVenue,
    setAmount,
    goNext,
    goBack,
    goToPhase,
    reset,
  };
}
