"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (provider: string) => void;
}

const calendarProviders = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Connect your Google Calendar account",
    icon: "/images/google.png",
    color: "bg-red-50 border-red-200 hover:bg-red-100"
  },
  {
    id: "outlook",
    name: "Outlook Calendar", 
    description: "Connect your Microsoft Outlook account",
    icon: "/images/monitor.png", // Using monitor as placeholder
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100"
  },
  {
    id: "apple",
    name: "Apple Calendar",
    description: "Connect your Apple iCloud Calendar",
    icon: "/images/profile.png", // Using profile as placeholder
    color: "bg-gray-50 border-gray-200 hover:bg-gray-100"
  }
];

export default function AddAccountModal({ isOpen, onClose, onAddAccount }: AddAccountModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    onAddAccount(providerId);
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                      <span className="text-2xl">🔗</span>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        Connect Calendar Account
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Choose a calendar provider to connect your account and sync your events.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <div className="w-full space-y-3">
                    {calendarProviders.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => handleProviderSelect(provider.id)}
                        className={`w-full flex items-center p-4 rounded-lg border-2 transition-colors ${provider.color}`}
                      >
                        <Image
                          src={provider.icon}
                          width={32}
                          height={32}
                          alt={provider.name}
                          className="w-8 h-8 mr-4"
                        />
                        <div className="text-left">
                          <h4 className="font-medium text-gray-900">{provider.name}</h4>
                          <p className="text-sm text-gray-600">{provider.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 