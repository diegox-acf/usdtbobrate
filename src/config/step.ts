// sharedStore.ts
interface PrevNextProps {
  prev: number;
  next: number;
}

let prevNext: PrevNextProps;

export const setPrevNextStep = (value: PrevNextProps) => {
  prevNext = value;
};

export const getPrevNextStep = () => prevNext;
