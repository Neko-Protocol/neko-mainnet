"use client";

import { useReducer, useCallback } from "react";
import type {
  SimulatorAction,
  SimulatorDestination,
  SimulatorState,
  SimulatorToken,
  WizardStep,
} from "../types/simulator.types";

const initialState: SimulatorState = {
  step: 1,
  token: null,
  destination: null,
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
        amount: isSameToken ? state.amount : "",
      };
    }
    case "selectDestination": {
      const isSame = state.destination?.id === action.destination.id;
      return {
        ...state,
        destination: action.destination,
        amount: isSame ? state.amount : "",
      };
    }
    case "setAmount":
      return { ...state, amount: action.amount };
    case "goNext": {
      if (state.step === 1 && !state.token) return state;
      if (state.step === 2 && !state.destination) return state;
      const nextStep = Math.min(3, state.step + 1) as WizardStep;
      return { ...state, step: nextStep };
    }
    case "goBack": {
      const prevStep = Math.max(1, state.step - 1) as WizardStep;
      return { ...state, step: prevStep };
    }
    case "goToStep":
      return { ...state, step: action.step };
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
  const setAmount = useCallback(
    (amount: string) => dispatch({ type: "setAmount", amount }),
    []
  );
  const goNext = useCallback(() => dispatch({ type: "goNext" }), []);
  const goBack = useCallback(() => dispatch({ type: "goBack" }), []);
  const goToStep = useCallback(
    (step: WizardStep) => dispatch({ type: "goToStep", step }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return {
    state,
    selectToken,
    selectDestination,
    setAmount,
    goNext,
    goBack,
    goToStep,
    reset,
  };
}
