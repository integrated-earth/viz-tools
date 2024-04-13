'''
This script exports the current scene as a vtkjs file
for every time step of the model. The vtkjs files can then
be viewed using the web-based tool :
https://kitware.github.io/vtk-js/examples/SceneExplorer.html
Currently, the output files are stored in the same directory as the
input model directory.
The script also outputs a csv file with two columns corresponding to the
timestep and the output filename.

In Paraview, first apply all the necessary filters to a model to prepare
what scence we want to export. Next, apply this script as a macro
to export all the time-steps with the current scene in vtkjs format.
'''

import os
import numpy as np
# import paraview
#paraview.compatibility.major = 5
#paraview.compatibility.minor = 10

from paraview.simple import *

#### disable automatic camera reset on 'Show'
paraview.simple._DisableFirstRenderCameraReset()

# get active view
renderView1 = GetActiveViewOrCreate('RenderView')

# get active source.
solutionpvd = GetActiveSource()

output_directory = os.path.dirname(solutionpvd.FileName)
output_name      = '/solution'

output_times = solutionpvd.TimestepValues.GetData()

print (output_directory + output_name)

counter  = 1
filename = []

for i in range(len(output_times)):
    # export view
    file_name = output_directory + output_name + format(counter, '04d') + '.vtkjs'
    ExportView(file_name, view=renderView1, ParaViewGlanceHTML='')

    # get animation scene
    animationScene1 = GetAnimationScene()
    animationScene1.GoToNext()
    counter += 1    
    filename.append(file_name)

time_steps = np.arange(0, len(output_times))
np.savetxt(output_directory + '/solution.csv', np.column_stack((time_steps.astype(np.object),
           output_times, filename)), fmt='%s')
